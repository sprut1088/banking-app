package com.banking.auth.dto;

public record LoginResponse(
        String customerId,
        String username,
        String message
) {
}
