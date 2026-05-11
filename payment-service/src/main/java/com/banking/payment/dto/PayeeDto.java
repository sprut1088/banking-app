package com.banking.payment.dto;

public record PayeeDto(
        String payeeId,
        String name,
        String iban,
        String bic,
        String bankName
) {
}
