package com.banking.auth.service;

import com.banking.auth.MockDataStore;
import com.banking.auth.dto.LoginRequest;
import com.banking.auth.dto.LoginResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    public LoginResponse login(LoginRequest request) {
        String expectedPassword = MockDataStore.USER_PASSWORDS.get(request.username());
        if (expectedPassword == null || !expectedPassword.equals(request.password())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        return new LoginResponse(
                MockDataStore.USER_CUSTOMER_MAP.get(request.username()),
                request.username(),
                "Login successful"
        );
    }

    public void assertCredentialPair(String username, String password) {
        String expectedPassword = MockDataStore.USER_PASSWORDS.get(username);
        if (expectedPassword == null || !expectedPassword.equals(password)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
    }
}
