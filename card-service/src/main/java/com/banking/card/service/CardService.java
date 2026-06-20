package com.banking.card.service;

import com.banking.card.MockDataStore;
import com.banking.card.dto.CardChargeRequest;
import com.banking.card.dto.CardDto;
import com.banking.card.dto.CardTransactionDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class CardService {

    private static final Logger LOGGER = LoggerFactory.getLogger(CardService.class);

    public CardDto getCardByCustomerId(String customerId) {
        CardDto card = MockDataStore.CARDS.get(customerId);
        if (card == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Card not found for customerId: " + customerId);
        }
        return card;
    }

    public List<CardTransactionDto> getCardTransactions(String customerId) {
        getCardByCustomerId(customerId);
        return MockDataStore.CARD_TRANSACTIONS_BY_CUSTOMER.getOrDefault(customerId, List.of())
                .stream()
                .sorted((left, right) -> right.timestamp().compareTo(left.timestamp()))
                .toList();
    }

    public CardTransactionDto chargeCard(String customerId, CardChargeRequest request) {
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be greater than 0");
        }

        String settlementType = request.settlementType().trim().toUpperCase();
        if (!"INSTANT".equals(settlementType) && !"SEPA".equals(settlementType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "settlementType must be INSTANT or SEPA");
        }

        synchronized (MockDataStore.CARDS) {
            CardDto current = getCardByCustomerId(customerId);
            BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);

            if (!"ACTIVE".equalsIgnoreCase(current.status())) {
                recordFailedTransaction(customerId, current, request, "Card is not active");
                LOGGER.warn("Card charge rejected customerId={} cardId={} reason=card_not_active amount={}",
                        customerId, current.cardId(), amount);
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Card is not active");
            }

            if (current.availableCredit().compareTo(amount) < 0) {
                recordFailedTransaction(customerId, current, request, "Insufficient available credit");
                LOGGER.warn("Card charge rejected customerId={} cardId={} reason=insufficient_credit available={} amount={}",
                        customerId, current.cardId(), current.availableCredit(), amount);
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Insufficient available credit");
            }

            BigDecimal updatedAvailableCredit = current.availableCredit().subtract(amount).setScale(2, RoundingMode.HALF_UP);
            CardDto updatedCard = new CardDto(
                    current.cardId(),
                    current.customerId(),
                    current.cardHolderName(),
                    current.maskedCardNumber(),
                    current.cardType(),
                    current.expiryDate(),
                    current.cvvHint(),
                    current.creditLimit(),
                    updatedAvailableCredit,
                    current.status()
            );
            MockDataStore.CARDS.put(customerId, updatedCard);

            CardTransactionDto created = new CardTransactionDto(
                    "CTX-" + UUID.randomUUID(),
                    customerId,
                    updatedCard.cardId(),
                    request.payeeId(),
                    amount,
                    "EUR",
                    settlementType,
                    request.reference(),
                    "SUCCESS",
                    null,
                    updatedAvailableCredit,
                    OffsetDateTime.now()
            );

            MockDataStore.CARD_TRANSACTIONS_BY_CUSTOMER
                    .computeIfAbsent(customerId, key -> new java.util.concurrent.CopyOnWriteArrayList<>())
                    .add(0, created);

            LOGGER.info("Card charge approved customerId={} cardId={} amount={} availableCreditAfter={} reference={}",
                    customerId, updatedCard.cardId(), amount, updatedAvailableCredit, request.reference());
            return created;
        }
    }

    private void recordFailedTransaction(String customerId, CardDto card, CardChargeRequest request, String failureReason) {
        CardTransactionDto failed = new CardTransactionDto(
                "CTX-" + UUID.randomUUID(),
                customerId,
                card.cardId(),
                request.payeeId(),
                request.amount().setScale(2, RoundingMode.HALF_UP),
                "EUR",
                request.settlementType().trim().toUpperCase(),
                request.reference(),
                "FAILED",
                failureReason,
                card.availableCredit().setScale(2, RoundingMode.HALF_UP),
                OffsetDateTime.now()
        );

        MockDataStore.CARD_TRANSACTIONS_BY_CUSTOMER
                .computeIfAbsent(customerId, key -> new java.util.concurrent.CopyOnWriteArrayList<>())
                .add(0, failed);
    }
}
