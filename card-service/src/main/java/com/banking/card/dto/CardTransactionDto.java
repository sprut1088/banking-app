package com.banking.card.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CardTransactionDto(
        String cardTransactionId,
        String customerId,
        String cardId,
        String payeeId,
        BigDecimal amount,
        String currency,
        String settlementType,
        String reference,
        String status,
        String failureReason,
        BigDecimal availableCreditAfter,
        OffsetDateTime timestamp
) {
}
