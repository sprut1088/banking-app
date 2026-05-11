package com.banking.card.controller;

import com.banking.card.dto.CardDto;
import com.banking.card.service.CardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cards")
public class CardController {

    private final CardService cardService;

    public CardController(CardService cardService) {
        this.cardService = cardService;
    }

    @GetMapping("/{customerId}")
    public ResponseEntity<CardDto> getCard(@PathVariable String customerId) {
        return ResponseEntity.ok(cardService.getCardByCustomerId(customerId));
    }
}
