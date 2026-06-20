package com.banking.transaction.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record TransactionCreateRequest(
        @NotBlank String customerId,
        @NotBlank String description,
        @DecimalMin(value = "0.01") BigDecimal amount,
        @NotBlank String type,
        @DecimalMin(value = "0.00") BigDecimal balanceAfter,
        @NotBlank String reference
) {
}
