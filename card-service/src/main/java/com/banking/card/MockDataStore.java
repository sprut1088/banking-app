package com.banking.card;

import com.banking.card.dto.CardDto;
import com.banking.card.dto.CardTransactionDto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

public final class MockDataStore {

    public static final Map<String, CardDto> CARDS = new LinkedHashMap<>();
    public static final Map<String, List<CardTransactionDto>> CARD_TRANSACTIONS_BY_CUSTOMER = new LinkedHashMap<>();

    static {
        CARDS.put("CUST001", new CardDto("CARD001", "CUST001", "Alice Murphy", "**** **** **** 1021", "VISA", "11/28", "***", new BigDecimal("5000.00"), new BigDecimal("4200.00"), "ACTIVE"));
        CARDS.put("CUST002", new CardDto("CARD002", "CUST002", "Bob O'Connor", "**** **** **** 2032", "MASTERCARD", "05/27", "***", new BigDecimal("4000.00"), new BigDecimal("1980.50"), "ACTIVE"));
        CARDS.put("CUST003", new CardDto("CARD003", "CUST003", "Charlie Doyle", "**** **** **** 3043", "VISA", "09/29", "***", new BigDecimal("6500.00"), new BigDecimal("6100.00"), "ACTIVE"));
        CARDS.put("CUST004", new CardDto("CARD004", "CUST004", "Diana Walsh", "**** **** **** 4054", "MASTERCARD", "01/27", "***", new BigDecimal("3500.00"), new BigDecimal("800.00"), "BLOCKED"));
        CARDS.put("CUST005", new CardDto("CARD005", "CUST005", "Edward Byrne", "**** **** **** 5065", "VISA", "07/30", "***", new BigDecimal("9000.00"), new BigDecimal("8700.00"), "ACTIVE"));
        CARDS.put("CUST006", new CardDto("CARD006", "CUST006", "Fiona Kelly", "**** **** **** 6076", "MASTERCARD", "03/28", "***", new BigDecimal("7000.00"), new BigDecimal("2500.45"), "ACTIVE"));
        CARDS.put("CUST007", new CardDto("CARD007", "CUST007", "George Nolan", "**** **** **** 7087", "VISA", "12/26", "***", new BigDecimal("10000.00"), new BigDecimal("1500.00"), "BLOCKED"));
        CARDS.put("CUST008", new CardDto("CARD008", "CUST008", "Helen Ryan", "**** **** **** 8098", "MASTERCARD", "08/29", "***", new BigDecimal("5500.00"), new BigDecimal("5100.20"), "ACTIVE"));

        for (Map.Entry<String, CardDto> entry : CARDS.entrySet()) {
            CardDto card = entry.getValue();
            List<CardTransactionDto> txs = new ArrayList<>();
            txs.add(new CardTransactionDto(
                    "CTX-" + entry.getKey() + "-01",
                    entry.getKey(),
                    card.cardId(),
                    "PAY003",
                    new BigDecimal("14.99"),
                    "EUR",
                    "INSTANT",
                    "Streaming Subscription",
                    "SUCCESS",
                    null,
                    card.availableCredit(),
                    OffsetDateTime.now().minusDays(8)
            ));
            CARD_TRANSACTIONS_BY_CUSTOMER.put(entry.getKey(), new CopyOnWriteArrayList<>(txs));
        }
    }

    private MockDataStore() {
    }
}
