package com.banking.account.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record BalanceAdjustmentRequest(
        @NotBlank String customerId,
        @DecimalMin(value = "0.01") BigDecimal amount,
        @NotBlank String direction,
        String reason,
        String reference
) {
}
