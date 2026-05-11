package com.banking.payment.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PaymentRecord(
        String paymentId,
        String customerId,
        String fromAccount,
        String toPayeeId,
        BigDecimal amount,
        String reference,
        String currency,
        String status,
        OffsetDateTime timestamp
) {
}
