package com.banking.account.dto;

import java.math.BigDecimal;

public record AccountDto(
        String customerId,
        String accountHolderName,
        String accountNumber,
        String iban,
        String bic,
        String branchCode,
        String accountType,
        BigDecimal balance,
        String currency,
        String status
) {
}
