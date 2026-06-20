package com.banking.card.controller;

import com.banking.card.dto.CardChargeRequest;
import com.banking.card.dto.CardDto;
import com.banking.card.dto.CardTransactionDto;
import jakarta.validation.Valid;
import com.banking.card.service.CardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/cards")
public class CardController {

    private final CardService cardService;

    public CardController(CardService cardService) {
        this.cardService = cardService;
    }

    @GetMapping("/{customerId}")
    public ResponseEntity<CardDto> getCard(@PathVariable("customerId") String customerId) {
        return ResponseEntity.ok(cardService.getCardByCustomerId(customerId));
    }

    @GetMapping("/{customerId}/transactions")
    public ResponseEntity<List<CardTransactionDto>> getCardTransactions(@PathVariable("customerId") String customerId) {
        return ResponseEntity.ok(cardService.getCardTransactions(customerId));
    }

    @PostMapping("/{customerId}/transactions/charge")
    public ResponseEntity<CardTransactionDto> chargeCard(@PathVariable("customerId") String customerId,
                                                         @Valid @RequestBody CardChargeRequest request) {
        return ResponseEntity.ok(cardService.chargeCard(customerId, request));
    }
}
