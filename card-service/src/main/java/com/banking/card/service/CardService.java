package com.banking.card.service;

import com.banking.card.MockDataStore;
import com.banking.card.dto.CardDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CardService {

    public CardDto getCardByCustomerId(String customerId) {
        CardDto card = MockDataStore.CARDS.get(customerId);
        if (card == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Card not found for customerId: " + customerId);
        }
        return card;
    }
}
