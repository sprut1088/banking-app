package com.banking.transaction.service;

import com.banking.transaction.MockDataStore;
import com.banking.transaction.dto.TransactionDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
public class TransactionService {

    public List<TransactionDto> getTransactions(String customerId) {
        List<TransactionDto> txs = MockDataStore.TRANSACTIONS_BY_CUSTOMER.get(customerId);
        if (txs == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Transactions not found for customerId: " + customerId);
        }
        return txs.stream()
                .sorted(Comparator.comparing(TransactionDto::date).reversed())
                .toList();
    }
}
