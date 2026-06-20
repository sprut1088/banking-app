package com.banking.card.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record CardChargeRequest(
        @DecimalMin(value = "0.01") BigDecimal amount,
        @NotBlank String reference,
        @NotBlank String payeeId,
        @NotBlank String settlementType
) {
}
