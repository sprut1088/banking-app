package com.banking.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionDto(
        String transactionId,
        LocalDate date,
        String description,
        BigDecimal amount,
        String type,
        BigDecimal balanceAfter,
        String reference
) {
}
