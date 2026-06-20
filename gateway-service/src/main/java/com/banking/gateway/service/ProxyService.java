package com.banking.gateway.service;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.MDC;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class ProxyService {

    private final RestTemplate restTemplate;

    public ProxyService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public ResponseEntity<String> forward(HttpMethod method, String url, String authHeader, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        propagateTracingHeaders(headers);
        if (authHeader != null && !authHeader.isBlank()) {
            headers.set(HttpHeaders.AUTHORIZATION, authHeader);
        }
        HttpEntity<String> requestEntity = new HttpEntity<>(body, headers);
        try {
            return restTemplate.exchange(url, method, requestEntity, String.class);
        } catch (HttpStatusCodeException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(ex.getResponseBodyAsString());
        }
    }

    private void propagateTracingHeaders(HttpHeaders outgoingHeaders) {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return;
        }

        HttpServletRequest incomingRequest = attrs.getRequest();
        copyHeaderIfPresent(incomingRequest, outgoingHeaders, "traceparent");
        copyHeaderIfPresent(incomingRequest, outgoingHeaders, "tracestate");
        copyHeaderIfPresent(incomingRequest, outgoingHeaders, "baggage");
        copyHeaderIfPresent(incomingRequest, outgoingHeaders, "X-B3-TraceId");
        copyHeaderIfPresent(incomingRequest, outgoingHeaders, "X-B3-SpanId");
        copyHeaderIfPresent(incomingRequest, outgoingHeaders, "X-B3-Sampled");
        copyHeaderIfPresent(incomingRequest, outgoingHeaders, "b3");
        copyHeaderIfPresent(incomingRequest, outgoingHeaders, "X-Correlation-Id");

        if (!outgoingHeaders.containsKey("X-Correlation-Id")) {
            String fallbackCorrelationId = MDC.get("correlation_id");
            if (fallbackCorrelationId == null || fallbackCorrelationId.isBlank()) {
                fallbackCorrelationId = MDC.get("trace_id");
            }
            if (fallbackCorrelationId != null && !fallbackCorrelationId.isBlank()) {
                outgoingHeaders.set("X-Correlation-Id", fallbackCorrelationId);
            }
        }
    }

    private void copyHeaderIfPresent(HttpServletRequest incomingRequest, HttpHeaders outgoingHeaders, String headerName) {
        String value = incomingRequest.getHeader(headerName);
        if (value != null && !value.isBlank()) {
            outgoingHeaders.set(headerName, value);
        }
    }
}
