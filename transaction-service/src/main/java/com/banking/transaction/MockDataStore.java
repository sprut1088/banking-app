package com.banking.transaction;

import com.banking.transaction.dto.TransactionDto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class MockDataStore {

    public static final Map<String, List<TransactionDto>> TRANSACTIONS_BY_CUSTOMER = new LinkedHashMap<>();

    static {
        for (int i = 1; i <= 8; i++) {
            String customerId = "CUST00" + i;
            List<TransactionDto> list = new ArrayList<>();
            list.add(new TransactionDto("TX-" + customerId + "-01", LocalDate.now().minusDays(2), "Salary Credit", new BigDecimal("2500.00"), "CREDIT", new BigDecimal("8800.50"), "SAL" + i + "2026"));
            list.add(new TransactionDto("TX-" + customerId + "-02", LocalDate.now().minusDays(4), "Supermarket", new BigDecimal("86.42"), "DEBIT", new BigDecimal("8714.08"), "GRC" + i + "2601"));
            list.add(new TransactionDto("TX-" + customerId + "-03", LocalDate.now().minusDays(7), "Electricity Bill", new BigDecimal("121.77"), "DEBIT", new BigDecimal("8592.31"), "UTL" + i + "2602"));
            list.add(new TransactionDto("TX-" + customerId + "-04", LocalDate.now().minusDays(12), "Streaming Subscription", new BigDecimal("14.99"), "DEBIT", new BigDecimal("8577.32"), "STR" + i + "2603"));
            list.add(new TransactionDto("TX-" + customerId + "-05", LocalDate.now().minusDays(18), "ATM Withdrawal", new BigDecimal("100.00"), "DEBIT", new BigDecimal("8477.32"), "ATM" + i + "2604"));
            TRANSACTIONS_BY_CUSTOMER.put(customerId, list);
        }
    }

    private MockDataStore() {
    }
}
