package com.banking.payment.config;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.io.IOException;
import java.util.List;

@Configuration
public class RestClientConfig {

    @Bean
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.setInterceptors(List.of(new CorrelationPropagationInterceptor()));
        return restTemplate;
    }

    private static class CorrelationPropagationInterceptor implements ClientHttpRequestInterceptor {

        @Override
        public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest incoming = attrs.getRequest();
                copyHeaderIfPresent(incoming, request, "traceparent");
                copyHeaderIfPresent(incoming, request, "tracestate");
                copyHeaderIfPresent(incoming, request, "baggage");
                copyHeaderIfPresent(incoming, request, "X-B3-TraceId");
                copyHeaderIfPresent(incoming, request, "X-B3-SpanId");
                copyHeaderIfPresent(incoming, request, "X-B3-Sampled");
                copyHeaderIfPresent(incoming, request, "b3");
                copyHeaderIfPresent(incoming, request, "X-Correlation-Id");
            }

            if (!request.getHeaders().containsKey("X-Correlation-Id")) {
                String correlationId = MDC.get("correlation_id");
                if (correlationId == null || correlationId.isBlank()) {
                    correlationId = MDC.get("trace_id");
                }
                if (correlationId != null && !correlationId.isBlank()) {
                    request.getHeaders().set("X-Correlation-Id", correlationId);
                }
            }

            return execution.execute(request, body);
        }

        private void copyHeaderIfPresent(HttpServletRequest incoming, HttpRequest outgoing, String headerName) {
            String value = incoming.getHeader(headerName);
            if (value != null && !value.isBlank()) {
                outgoing.getHeaders().set(headerName, value);
            }
        }
    }
}
