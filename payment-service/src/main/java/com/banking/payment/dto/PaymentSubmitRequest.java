package com.banking.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record PaymentSubmitRequest(
        @NotBlank String customerId,
        @NotBlank String fromAccount,
        @NotBlank String toPayeeId,
        @DecimalMin(value = "0.01") BigDecimal amount,
        @NotBlank String reference,
        @NotBlank String currency
) {
}
