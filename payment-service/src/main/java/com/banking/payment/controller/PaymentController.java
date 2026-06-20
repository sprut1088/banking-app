package com.banking.payment.controller;

import com.banking.payment.dto.PayeeDto;
import com.banking.payment.dto.PaymentRecord;
import com.banking.payment.dto.PaymentSubmitRequest;
import com.banking.payment.dto.PaymentSubmitResponse;
import com.banking.payment.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/payees")
    public ResponseEntity<List<PayeeDto>> getPayees() {
        return ResponseEntity.ok(paymentService.getPayees());
    }

    @GetMapping("/{customerId}/history")
    public ResponseEntity<List<PaymentRecord>> getHistory(@PathVariable("customerId") String customerId) {
        return ResponseEntity.ok(paymentService.getHistory(customerId));
    }

    @PostMapping("/submit")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<PaymentSubmitResponse> submit(@Valid @RequestBody PaymentSubmitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.submitPayment(request));
    }
}
