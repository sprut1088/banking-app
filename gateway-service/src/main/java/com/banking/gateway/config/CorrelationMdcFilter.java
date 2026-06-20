package com.banking.gateway.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationMdcFilter extends OncePerRequestFilter {

    private static final String TRACE_ID = "trace_id";
    private static final String SPAN_ID = "span_id";
    private static final String CORRELATION_ID = "correlation_id";
    private static final String CORRELATION_HEADER = "X-Correlation-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String correlationId = firstNonBlank(request.getHeader(CORRELATION_HEADER), UUID.randomUUID().toString());
        String traceIdValue = firstNonBlank(extractTraceId(request), correlationId);
        String spanIdValue = firstNonBlank(extractSpanId(request), "0000000000000000");

        boolean setTrace = isBlank(MDC.get(TRACE_ID));
        boolean setSpan = isBlank(MDC.get(SPAN_ID));

        if (setTrace) {
            MDC.put(TRACE_ID, traceIdValue);
        }
        if (setSpan) {
            MDC.put(SPAN_ID, spanIdValue);
        }
        MDC.put(CORRELATION_ID, correlationId);
        response.setHeader(CORRELATION_HEADER, correlationId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(CORRELATION_ID);
            if (setTrace) {
                MDC.remove(TRACE_ID);
            }
            if (setSpan) {
                MDC.remove(SPAN_ID);
            }
        }
    }

    private String extractTraceId(HttpServletRequest request) {
        String traceparent = request.getHeader("traceparent");
        if (!isBlank(traceparent)) {
            String[] parts = traceparent.split("-");
            if (parts.length >= 4 && !isBlank(parts[1])) {
                return parts[1];
            }
        }
        String b3Trace = request.getHeader("X-B3-TraceId");
        return isBlank(b3Trace) ? null : b3Trace;
    }

    private String extractSpanId(HttpServletRequest request) {
        String traceparent = request.getHeader("traceparent");
        if (!isBlank(traceparent)) {
            String[] parts = traceparent.split("-");
            if (parts.length >= 4 && !isBlank(parts[2])) {
                return parts[2];
            }
        }
        String b3Span = request.getHeader("X-B3-SpanId");
        return isBlank(b3Span) ? null : b3Span;
    }

    private String firstNonBlank(String first, String second) {
        return isBlank(first) ? second : first;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
