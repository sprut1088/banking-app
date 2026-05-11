package com.banking.card.dto;

import java.math.BigDecimal;

public record CardDto(
        String cardId,
        String customerId,
        String cardHolderName,
        String maskedCardNumber,
        String cardType,
        String expiryDate,
        String cvvHint,
        BigDecimal creditLimit,
        BigDecimal availableCredit,
        String status
) {
}
