package com.banking.payment.service;

import com.banking.payment.MockDataStore;
import com.banking.payment.dto.PayeeDto;
import com.banking.payment.dto.PaymentRecord;
import com.banking.payment.dto.PaymentSubmitRequest;
import com.banking.payment.dto.PaymentSubmitResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class PaymentService {

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
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be greater than 0");
        }
        if (!MockDataStore.CUSTOMERS.contains(request.customerId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown customerId");
        }
        if (!MockDataStore.PAYEES.containsKey(request.toPayeeId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown payeeId");
        }

        String paymentId = "PMT-" + UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();
        MockDataStore.PAYMENT_RECORDS.add(new PaymentRecord(
                paymentId,
                request.customerId(),
                request.fromAccount(),
                request.toPayeeId(),
                request.amount().setScale(2, java.math.RoundingMode.HALF_UP),
                request.reference(),
                request.currency(),
                "SUCCESS",
                now
        ));
        return new PaymentSubmitResponse(paymentId, "SUCCESS", now, "Payment submitted successfully");
    }
}
