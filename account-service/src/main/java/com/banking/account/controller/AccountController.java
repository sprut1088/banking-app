package com.banking.account.controller;

import com.banking.account.dto.AccountDto;
import com.banking.account.dto.BalanceAdjustmentRequest;
import jakarta.validation.Valid;
import com.banking.account.service.AccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping("/{customerId}")
    public ResponseEntity<AccountDto> getAccount(@PathVariable("customerId") String customerId) {
        return ResponseEntity.ok(accountService.getAccountByCustomerId(customerId));
    }

    @PostMapping("/{customerId}/balance-adjustments")
    public ResponseEntity<AccountDto> adjustBalance(@PathVariable("customerId") String customerId,
                                                    @Valid @RequestBody BalanceAdjustmentRequest request) {
        return ResponseEntity.ok(accountService.adjustBalance(customerId, request));
    }
}
