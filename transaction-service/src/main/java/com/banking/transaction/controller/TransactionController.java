package com.banking.transaction.controller;

import com.banking.transaction.dto.TransactionCreateRequest;
import com.banking.transaction.dto.TransactionDto;
import jakarta.validation.Valid;
import com.banking.transaction.service.TransactionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping("/{customerId}")
    public ResponseEntity<List<TransactionDto>> getTransactions(@PathVariable("customerId") String customerId) {
        return ResponseEntity.ok(transactionService.getTransactions(customerId));
    }

    @PostMapping
    public ResponseEntity<TransactionDto> addTransaction(@Valid @RequestBody TransactionCreateRequest request) {
        return ResponseEntity.ok(transactionService.addTransaction(request));
    }
}
