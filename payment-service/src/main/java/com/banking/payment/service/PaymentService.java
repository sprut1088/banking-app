package com.banking.payment.service;

import com.banking.payment.MockDataStore;
import com.banking.payment.dto.PayeeDto;
import com.banking.payment.dto.PaymentRecord;
import com.banking.payment.dto.PaymentSubmitRequest;
import com.banking.payment.dto.PaymentSubmitResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger LOGGER = LoggerFactory.getLogger(PaymentService.class);
    private static final BigDecimal SEPA_REVIEW_THRESHOLD = new BigDecimal("2000.00");

    private final RestTemplate restTemplate;
    private final PaymentMetricsRecorder paymentMetricsRecorder;
    private final String accountServiceBaseUrl;
    private final String transactionServiceBaseUrl;
    private final String cardServiceBaseUrl;

    public PaymentService(
            RestTemplate restTemplate,
            PaymentMetricsRecorder paymentMetricsRecorder,
            @Value("${integration.accountServiceBaseUrl:http://account-service:7082}") String accountServiceBaseUrl,
            @Value("${integration.transactionServiceBaseUrl:http://transaction-service:7083}") String transactionServiceBaseUrl,
            @Value("${integration.cardServiceBaseUrl:http://card-service:7084}") String cardServiceBaseUrl) {
        this.restTemplate = restTemplate;
        this.paymentMetricsRecorder = paymentMetricsRecorder;
        this.accountServiceBaseUrl = accountServiceBaseUrl;
        this.transactionServiceBaseUrl = transactionServiceBaseUrl;
        this.cardServiceBaseUrl = cardServiceBaseUrl;
    }

    public List<PayeeDto> getPayees() {
        return MockDataStore.PAYEES.values().stream().toList();
    }

    public List<PaymentRecord> getHistory(String customerId) {
        if (!MockDataStore.CUSTOMERS.contains(customerId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found: " + customerId);
        }
        return MockDataStore.PAYMENT_RECORDS.stream()
                .filter(record -> customerId.equals(record.customerId()))
                .toList();
    }

    public PaymentSubmitResponse submitPayment(PaymentSubmitRequest request) {
        long processingStartNs = System.nanoTime();
        String paymentRail = "unknown";
        String settlementType = "unknown";
        String processingFailureReason = "none";

        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            processingFailureReason = "invalid_amount";
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be greater than 0");
        }
        if (!MockDataStore.CUSTOMERS.contains(request.customerId())) {
            processingFailureReason = "unknown_customer";
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown customerId");
        }
        if (!MockDataStore.PAYEES.containsKey(request.toPayeeId())) {
            processingFailureReason = "unknown_payee";
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown payeeId");
        }

        try {
            BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);
            if (!"EUR".equalsIgnoreCase(request.currency())) {
                processingFailureReason = "unsupported_currency";
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only EUR currency is supported for demo flows");
            }

            paymentRail = normalizePaymentRail(request.paymentRail());
            settlementType = normalizeSettlementType(request.settlementType());
            paymentMetricsRecorder.incrementSubmission(paymentRail, settlementType, "none");

            String paymentId = "PMT-" + UUID.randomUUID();
            OffsetDateTime now = OffsetDateTime.now();

            String failedReason = runPreChecks(request, amount, paymentRail, settlementType);
            if (failedReason != null) {
                processingFailureReason = failedReason;
                LOGGER.warn("Payment rejected paymentId={} customerId={} rail={} settlement={} reason={}",
                        paymentId, request.customerId(), paymentRail, settlementType, failedReason);
                recordPayment(request, paymentId, now, paymentRail, settlementType, "FAILED", failedReason, amount);
                paymentMetricsRecorder.incrementFailure(paymentRail, settlementType, normalizeMetricReason(failedReason));
                return new PaymentSubmitResponse(
                        paymentId,
                        "FAILED",
                        now,
                        failedReason,
                        paymentRail,
                        settlementType,
                        null,
                        null
                );
            }

            PaymentSubmitResponse response;
            if ("ACCOUNT".equals(paymentRail)) {
                response = processAccountPayment(request, paymentId, now, settlementType, amount);
            } else {
                response = processCardPayment(request, paymentId, now, settlementType, amount);
            }

            if ("SUCCESS".equalsIgnoreCase(response.status())) {
                processingFailureReason = "none";
                paymentMetricsRecorder.incrementSuccess(paymentRail, settlementType);
            } else {
                processingFailureReason = response.message();
                paymentMetricsRecorder.incrementFailure(paymentRail, settlementType, normalizeMetricReason(response.message()));
            }
            return response;
        } catch (ResponseStatusException ex) {
            if (!"unknown".equals(paymentRail)) {
                paymentMetricsRecorder.incrementFailure(paymentRail, settlementType, normalizeMetricReason(ex.getReason()));
            }
            throw ex;
        } finally {
            double durationMs = (System.nanoTime() - processingStartNs) / 1_000_000.0;
            paymentMetricsRecorder.recordPaymentProcessingDuration(
                    paymentRail,
                    settlementType,
                    normalizeMetricReason(processingFailureReason),
                    durationMs
            );
        }
    }

    private PaymentSubmitResponse processAccountPayment(PaymentSubmitRequest request,
                                                        String paymentId,
                                                        OffsetDateTime now,
                                                        String settlementType,
                                                        BigDecimal amount) {
        Map<String, Object> accountUpdatePayload = new HashMap<>();
        accountUpdatePayload.put("customerId", request.customerId());
        accountUpdatePayload.put("amount", amount);
        accountUpdatePayload.put("direction", "DEBIT");
        accountUpdatePayload.put("reason", "PAYMENT_" + settlementType);
        accountUpdatePayload.put("reference", paymentId);

        BigDecimal newBalance;
        long accountCallStartNs = System.nanoTime();
        try {
            ResponseEntity<Map> accountResponse = restTemplate.postForEntity(
                    accountServiceBaseUrl + "/accounts/" + request.customerId() + "/balance-adjustments",
                    accountUpdatePayload,
                    Map.class
            );
            paymentMetricsRecorder.recordDownstreamCallDuration(
                    "account-service",
                    "ACCOUNT",
                    settlementType,
                    "none",
                    (System.nanoTime() - accountCallStartNs) / 1_000_000.0
            );
            newBalance = asBigDecimal(accountResponse.getBody() != null ? accountResponse.getBody().get("balance") : null);
        } catch (HttpStatusCodeException ex) {
            String reason = extractErrorMessage(ex, "Account debit failed");
            paymentMetricsRecorder.recordDownstreamCallDuration(
                    "account-service",
                    "ACCOUNT",
                    settlementType,
                    normalizeMetricReason(reason),
                    (System.nanoTime() - accountCallStartNs) / 1_000_000.0
            );
            LOGGER.warn("Account payment failed paymentId={} customerId={} reason={} status={}",
                    paymentId, request.customerId(), reason, ex.getStatusCode().value());
            recordPayment(request, paymentId, now, "ACCOUNT", settlementType, "FAILED", reason, amount);
            return new PaymentSubmitResponse(paymentId, "FAILED", now, reason, "ACCOUNT", settlementType, null, null);
        }

        Map<String, Object> transactionPayload = new HashMap<>();
        transactionPayload.put("customerId", request.customerId());
        transactionPayload.put("description", settlementType + " payment to " + request.toPayeeId());
        transactionPayload.put("amount", amount);
        transactionPayload.put("type", "DEBIT");
        transactionPayload.put("balanceAfter", newBalance);
        transactionPayload.put("reference", request.reference());

        long transactionCallStartNs = System.nanoTime();
        try {
            restTemplate.postForEntity(transactionServiceBaseUrl + "/transactions", transactionPayload, Map.class);
            paymentMetricsRecorder.recordDownstreamCallDuration(
                    "transaction-service",
                    "ACCOUNT",
                    settlementType,
                    "none",
                    (System.nanoTime() - transactionCallStartNs) / 1_000_000.0
            );
        } catch (HttpStatusCodeException ex) {
            String reason = extractErrorMessage(ex, "Transaction ledger update failed");
            paymentMetricsRecorder.recordDownstreamCallDuration(
                    "transaction-service",
                    "ACCOUNT",
                    settlementType,
                    normalizeMetricReason(reason),
                    (System.nanoTime() - transactionCallStartNs) / 1_000_000.0
            );
            rollbackAccountDebit(request.customerId(), amount, paymentId, settlementType, reason);
            LOGGER.error("Payment rollback executed paymentId={} customerId={} reason={}", paymentId, request.customerId(), reason);
            recordPayment(request, paymentId, now, "ACCOUNT", settlementType, "FAILED", reason, amount);
            return new PaymentSubmitResponse(paymentId, "FAILED", now, reason, "ACCOUNT", settlementType, null, null);
        }

        recordPayment(request, paymentId, now, "ACCOUNT", settlementType, "SUCCESS", null, amount);
        return new PaymentSubmitResponse(
                paymentId,
                "SUCCESS",
                now,
                "Payment booked successfully",
                "ACCOUNT",
                settlementType,
                newBalance.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                null
        );
    }

    private PaymentSubmitResponse processCardPayment(PaymentSubmitRequest request,
                                                     String paymentId,
                                                     OffsetDateTime now,
                                                     String settlementType,
                                                     BigDecimal amount) {
        Map<String, Object> cardChargePayload = new HashMap<>();
        cardChargePayload.put("amount", amount);
        cardChargePayload.put("reference", request.reference());
        cardChargePayload.put("payeeId", request.toPayeeId());
        cardChargePayload.put("settlementType", settlementType);

        BigDecimal availableCreditAfter;
        long cardCallStartNs = System.nanoTime();
        try {
            ResponseEntity<Map> cardChargeResponse = restTemplate.postForEntity(
                    cardServiceBaseUrl + "/cards/" + request.customerId() + "/transactions/charge",
                    cardChargePayload,
                    Map.class
            );
            paymentMetricsRecorder.recordDownstreamCallDuration(
                "card-service",
                "CARD",
                settlementType,
                "none",
                (System.nanoTime() - cardCallStartNs) / 1_000_000.0
            );
            availableCreditAfter = asBigDecimal(cardChargeResponse.getBody() != null
                    ? cardChargeResponse.getBody().get("availableCreditAfter") : null);
        } catch (HttpStatusCodeException ex) {
            String reason = extractErrorMessage(ex, "Card charge failed");
            paymentMetricsRecorder.recordDownstreamCallDuration(
                "card-service",
                "CARD",
                settlementType,
                normalizeMetricReason(reason),
                (System.nanoTime() - cardCallStartNs) / 1_000_000.0
            );
            LOGGER.warn("Card payment failed paymentId={} customerId={} reason={} status={}",
                    paymentId, request.customerId(), reason, ex.getStatusCode().value());
            recordPayment(request, paymentId, now, "CARD", settlementType, "FAILED", reason, amount);
            return new PaymentSubmitResponse(paymentId, "FAILED", now, reason, "CARD", settlementType, null, null);
        }

        recordPayment(request, paymentId, now, "CARD", settlementType, "SUCCESS", null, amount);
        return new PaymentSubmitResponse(
                paymentId,
                "SUCCESS",
                now,
                "Card payment authorised",
                "CARD",
                settlementType,
                null,
                availableCreditAfter.setScale(2, RoundingMode.HALF_UP).toPlainString()
        );
    }

    private String runPreChecks(PaymentSubmitRequest request, BigDecimal amount, String paymentRail, String settlementType) {
        if (request.reference() != null && request.reference().toUpperCase().contains("FAIL")) {
            return "Simulated failure triggered by reference keyword";
        }
        if ("SEPA".equals(settlementType) && amount.compareTo(SEPA_REVIEW_THRESHOLD) > 0) {
            return "SEPA payment queued for compliance review (demo failure path)";
        }
        if ("CARD".equals(paymentRail) && "PAY005".equals(request.toPayeeId())) {
            return "Card rail is not allowed for credit card repayment payee";
        }
        return null;
    }

    private void rollbackAccountDebit(String customerId,
                                      BigDecimal amount,
                                      String paymentId,
                                      String settlementType,
                                      String failureReason) {
        Map<String, Object> rollbackPayload = new HashMap<>();
        rollbackPayload.put("customerId", customerId);
        rollbackPayload.put("amount", amount);
        rollbackPayload.put("direction", "CREDIT");
        rollbackPayload.put("reason", "ROLLBACK_PAYMENT");
        rollbackPayload.put("reference", paymentId + "-RB");
        paymentMetricsRecorder.incrementRepairAttempt("ACCOUNT", settlementType, normalizeMetricReason(failureReason));

        long rollbackStartNs = System.nanoTime();
        try {
            restTemplate.postForEntity(
                    accountServiceBaseUrl + "/accounts/" + customerId + "/balance-adjustments",
                    rollbackPayload,
                    Map.class
            );
            paymentMetricsRecorder.recordDownstreamCallDuration(
                    "account-service",
                    "ACCOUNT",
                    settlementType,
                    "rollback_success",
                    (System.nanoTime() - rollbackStartNs) / 1_000_000.0
            );
        } catch (Exception ex) {
            paymentMetricsRecorder.recordDownstreamCallDuration(
                    "account-service",
                    "ACCOUNT",
                    settlementType,
                    "rollback_failed",
                    (System.nanoTime() - rollbackStartNs) / 1_000_000.0
            );
            LOGGER.error("Rollback failed paymentId={} customerId={} error={}", paymentId, customerId, ex.getMessage());
        }
    }

    private void recordPayment(PaymentSubmitRequest request,
                               String paymentId,
                               OffsetDateTime now,
                               String paymentRail,
                               String settlementType,
                               String status,
                               String failureReason,
                               BigDecimal amount) {
        MockDataStore.PAYMENT_RECORDS.add(new PaymentRecord(
                paymentId,
                request.customerId(),
                request.fromAccount(),
                request.toPayeeId(),
                amount,
                request.reference(),
                request.currency(),
                paymentRail,
                settlementType,
                status,
                failureReason,
                now
        ));
    }

    private String normalizePaymentRail(String rail) {
        if (rail == null || rail.isBlank()) {
            return "ACCOUNT";
        }
        String normalized = rail.trim().toUpperCase();
        if (!"ACCOUNT".equals(normalized) && !"CARD".equals(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "paymentRail must be ACCOUNT or CARD");
        }
        return normalized;
    }

    private String normalizeSettlementType(String settlementType) {
        if (settlementType == null || settlementType.isBlank()) {
            return "INSTANT";
        }
        String normalized = settlementType.trim().toUpperCase();
        if (!"INSTANT".equals(normalized) && !"SEPA".equals(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "settlementType must be INSTANT or SEPA");
        }
        return normalized;
    }

    private BigDecimal asBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(value.toString());
    }

    private String extractErrorMessage(HttpStatusCodeException ex, String fallback) {
        String body = ex.getResponseBodyAsString();
        if (body != null && !body.isBlank()) {
            int messageKeyIndex = body.indexOf("\"message\"");
            if (messageKeyIndex >= 0) {
                int firstQuote = body.indexOf('"', body.indexOf(':', messageKeyIndex) + 1);
                int secondQuote = firstQuote >= 0 ? body.indexOf('"', firstQuote + 1) : -1;
                if (firstQuote >= 0 && secondQuote > firstQuote) {
                    return body.substring(firstQuote + 1, secondQuote);
                }
            }
            return body;
        }
        return fallback;
    }

    private String normalizeMetricReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return "none";
        }
        return reason.toLowerCase(Locale.ROOT);
    }
}
