package com.banking.gateway.controller;

import com.banking.gateway.service.ProxyService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class GatewayController {

    private final ProxyService proxyService;

    public GatewayController(ProxyService proxyService) {
        this.proxyService = proxyService;
    }

    @PostMapping("/auth/login")
    public ResponseEntity<String> login(@RequestBody String body, @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        return proxyService.forward(HttpMethod.POST, "http://auth-service:7081/auth/login", auth, body);
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<String> logout(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        return proxyService.forward(HttpMethod.POST, "http://auth-service:7081/auth/logout", auth, null);
    }

    @GetMapping("/accounts/{id}")
    public ResponseEntity<String> getAccount(@PathVariable String id, @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        return proxyService.forward(HttpMethod.GET, "http://account-service:7082/accounts/" + id, auth, null);
    }

    @GetMapping("/transactions/{id}")
    public ResponseEntity<String> getTransactions(@PathVariable String id, @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        return proxyService.forward(HttpMethod.GET, "http://transaction-service:7083/transactions/" + id, auth, null);
    }

    @GetMapping("/cards/{id}")
    public ResponseEntity<String> getCards(@PathVariable String id, @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        return proxyService.forward(HttpMethod.GET, "http://card-service:7084/cards/" + id, auth, null);
    }

    @GetMapping("/payments/payees")
    public ResponseEntity<String> getPayees(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        return proxyService.forward(HttpMethod.GET, "http://payment-service:7085/payments/payees", auth, null);
    }

    @GetMapping("/payments/{id}/history")
    public ResponseEntity<String> getHistory(@PathVariable String id, @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        return proxyService.forward(HttpMethod.GET, "http://payment-service:7085/payments/" + id + "/history", auth, null);
    }

    @PostMapping("/payments/submit")
    public ResponseEntity<String> submitPayment(@RequestBody String body, @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        return proxyService.forward(HttpMethod.POST, "http://payment-service:7085/payments/submit", auth, body);
    }
}
