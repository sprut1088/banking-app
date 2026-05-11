package com.banking.payment.dto;

import java.time.OffsetDateTime;

public record PaymentSubmitResponse(
        String paymentId,
        String status,
        OffsetDateTime timestamp,
        String message
) {
}
