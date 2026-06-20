package com.banking.account.service;

import com.banking.account.MockDataStore;
import com.banking.account.dto.AccountDto;
import com.banking.account.dto.BalanceAdjustmentRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class AccountService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AccountService.class);

    public AccountDto getAccountByCustomerId(String customerId) {
        AccountDto dto = MockDataStore.ACCOUNTS.get(customerId);
        if (dto == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found for customerId: " + customerId);
        }
        return dto;
    }

    public AccountDto adjustBalance(String customerId, BalanceAdjustmentRequest request) {
        if (!customerId.equals(request.customerId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customerId path/body mismatch");
        }
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be greater than 0");
        }

        String direction = request.direction().trim().toUpperCase();
        if (!"DEBIT".equals(direction) && !"CREDIT".equals(direction)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "direction must be DEBIT or CREDIT");
        }

        synchronized (MockDataStore.ACCOUNTS) {
            AccountDto current = getAccountByCustomerId(customerId);
            BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);
            BigDecimal updatedBalance;

            if ("DEBIT".equals(direction)) {
                if (current.balance().compareTo(amount) < 0) {
                    LOGGER.warn("Insufficient funds customerId={} balance={} debit={} reference={}",
                            customerId, current.balance(), amount, request.reference());
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                            "Insufficient funds for customerId: " + customerId);
                }
                updatedBalance = current.balance().subtract(amount);
            } else {
                updatedBalance = current.balance().add(amount);
            }

            AccountDto updated = new AccountDto(
                    current.customerId(),
                    current.accountHolderName(),
                    current.accountNumber(),
                    current.iban(),
                    current.bic(),
                    current.branchCode(),
                    current.accountType(),
                    updatedBalance.setScale(2, RoundingMode.HALF_UP),
                    current.currency(),
                    current.status()
            );
            MockDataStore.ACCOUNTS.put(customerId, updated);

            LOGGER.info("Account balance updated customerId={} direction={} amount={} newBalance={} reason={} reference={}",
                    customerId, direction, amount, updated.balance(), request.reason(), request.reference());
            return updated;
        }
    }
}
