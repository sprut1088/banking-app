package com.banking.account;

import com.banking.account.dto.AccountDto;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

public final class MockDataStore {

    public static final Map<String, AccountDto> ACCOUNTS = new LinkedHashMap<>();

    static {
        ACCOUNTS.put("CUST001", new AccountDto("CUST001", "Alice Murphy", "IE21BOFI90001712345678", "IE21BOFI90001712345678", "BOFIIE2D", "BR001", "CURRENT", new BigDecimal("1250.45"), "EUR", "ACTIVE"));
        ACCOUNTS.put("CUST002", new AccountDto("CUST002", "Bob O'Connor", "IE82AIBK93115212345678", "IE82AIBK93115212345678", "AIBKIE2D", "BR002", "SAVINGS", new BigDecimal("5400.00"), "EUR", "ACTIVE"));
        ACCOUNTS.put("CUST003", new AccountDto("CUST003", "Charlie Doyle", "IE64IRCE92050112345678", "IE64IRCE92050112345678", "IRCEIE2D", "BR003", "CURRENT", new BigDecimal("8300.12"), "EUR", "ACTIVE"));
        ACCOUNTS.put("CUST004", new AccountDto("CUST004", "Diana Walsh", "IE12ULSB98539012345678", "IE12ULSB98539012345678", "ULSBIE2D", "BR004", "CURRENT", new BigDecimal("15670.35"), "EUR", "ACTIVE"));
        ACCOUNTS.put("CUST005", new AccountDto("CUST005", "Edward Byrne", "IE36PTSB99012312345678", "IE36PTSB99012312345678", "IPBSIE2D", "BR005", "SAVINGS", new BigDecimal("22100.00"), "EUR", "ACTIVE"));
        ACCOUNTS.put("CUST006", new AccountDto("CUST006", "Fiona Kelly", "IE44BOFI90001787654321", "IE44BOFI90001787654321", "BOFIIE2D", "BR006", "CURRENT", new BigDecimal("31250.90"), "EUR", "ACTIVE"));
        ACCOUNTS.put("CUST007", new AccountDto("CUST007", "George Nolan", "IE66AIBK93115287654321", "IE66AIBK93115287654321", "AIBKIE2D", "BR007", "SAVINGS", new BigDecimal("45000.00"), "EUR", "ACTIVE"));
        ACCOUNTS.put("CUST008", new AccountDto("CUST008", "Helen Ryan", "IE77IRCE92050187654321", "IE77IRCE92050187654321", "IRCEIE2D", "BR008", "CURRENT", new BigDecimal("9800.67"), "EUR", "ACTIVE"));
    }

    private MockDataStore() {
    }
}
