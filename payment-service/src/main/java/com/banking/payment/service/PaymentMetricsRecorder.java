package com.banking.payment.service;

import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class PaymentMetricsRecorder {

    private final MeterRegistry meterRegistry;
    private final String serviceName;

    public PaymentMetricsRecorder(MeterRegistry meterRegistry,
                                  @Value("${spring.application.name:payment-service}") String serviceName) {
        this.meterRegistry = meterRegistry;
        this.serviceName = serviceName;
    }

    public void incrementSubmission(String paymentRail, String settlementType, String failureReason) {
        meterRegistry.counter("payment_submissions", baseTags(paymentRail, settlementType, failureReason)).increment();
    }

    public void incrementSuccess(String paymentRail, String settlementType) {
        meterRegistry.counter("payment_success", baseTags(paymentRail, settlementType, "none")).increment();
    }

    public void incrementFailure(String paymentRail, String settlementType, String failureReason) {
        meterRegistry.counter("payment_failed", baseTags(paymentRail, settlementType, failureReason)).increment();
    }

    public void incrementRepairAttempt(String paymentRail, String settlementType, String failureReason) {
        meterRegistry.counter("payment_repair_attempt", baseTags(paymentRail, settlementType, failureReason)).increment();
    }

    public void recordPaymentProcessingDuration(String paymentRail,
                                                String settlementType,
                                                String failureReason,
                                                double durationMs) {
        DistributionSummary.builder("payment_processing_duration_ms")
                .tags(baseTags(paymentRail, settlementType, failureReason))
                .register(meterRegistry)
                .record(durationMs);
    }

    public void recordDownstreamCallDuration(String targetService,
                                             String paymentRail,
                                             String settlementType,
                                             String failureReason,
                                             double durationMs) {
        DistributionSummary.builder("downstream_call_duration_ms")
                .tags(baseTagsWithTarget(targetService, paymentRail, settlementType, failureReason))
                .register(meterRegistry)
                .record(durationMs);
    }

    private Tags baseTags(String paymentRail, String settlementType, String failureReason) {
        return Tags.of(
                "service_name", serviceName,
                "payment_rail", sanitize(paymentRail),
                "settlement_type", sanitize(settlementType),
                "failure_reason", sanitize(failureReason)
        );
    }

    private Tags baseTagsWithTarget(String targetService,
                                    String paymentRail,
                                    String settlementType,
                                    String failureReason) {
        return baseTags(paymentRail, settlementType, failureReason)
                .and("target_service", sanitize(targetService));
    }

    private String sanitize(String value) {
        if (value == null || value.isBlank()) {
            return "none";
        }
        return value.trim().replace(' ', '_').toLowerCase(Locale.ROOT);
    }
}
