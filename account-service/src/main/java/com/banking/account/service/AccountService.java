package com.banking.account.service;

import com.banking.account.MockDataStore;
import com.banking.account.dto.AccountDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountService {

    public AccountDto getAccountByCustomerId(String customerId) {
        AccountDto dto = MockDataStore.ACCOUNTS.get(customerId);
        if (dto == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found for customerId: " + customerId);
        }
        return dto;
    }
}
