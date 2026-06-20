package com.banking.transaction.service;

import com.banking.transaction.MockDataStore;
import com.banking.transaction.dto.TransactionCreateRequest;
import com.banking.transaction.dto.TransactionDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class TransactionService {

    private static final Logger LOGGER = LoggerFactory.getLogger(TransactionService.class);

    public List<TransactionDto> getTransactions(String customerId) {
        List<TransactionDto> txs = MockDataStore.TRANSACTIONS_BY_CUSTOMER.get(customerId);
        if (txs == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Transactions not found for customerId: " + customerId);
        }
        return txs.stream()
                .sorted(Comparator.comparing(TransactionDto::date).reversed())
                .toList();
    }

    public TransactionDto addTransaction(TransactionCreateRequest request) {
        String type = request.type().trim().toUpperCase();
        if (!"DEBIT".equals(type) && !"CREDIT".equals(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "type must be DEBIT or CREDIT");
        }

        List<TransactionDto> txs = MockDataStore.TRANSACTIONS_BY_CUSTOMER.get(request.customerId());
        if (txs == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Transactions not found for customerId: " + request.customerId());
        }

        TransactionDto created = new TransactionDto(
                "TX-" + UUID.randomUUID(),
                LocalDate.now(),
                request.description(),
                request.amount().setScale(2, RoundingMode.HALF_UP),
                type,
                request.balanceAfter().setScale(2, RoundingMode.HALF_UP),
                request.reference()
        );

        synchronized (txs) {
            txs.add(0, created);
        }

        LOGGER.info("Transaction created customerId={} transactionId={} type={} amount={} balanceAfter={} reference={}",
                request.customerId(), created.transactionId(), created.type(), created.amount(),
                created.balanceAfter(), created.reference());

        return created;
    }
}
