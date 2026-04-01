package com.fixcart.platform.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        int limit = resolveLimit(path);
        if (limit <= 0) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientKey = request.getRemoteAddr() + ":" + pathGroup(path);
        long now = Instant.now().getEpochSecond();
        WindowCounter counter = counters.compute(clientKey, (key, existing) -> {
            if (existing == null || now - existing.windowStartEpochSeconds() >= 60) {
                return new WindowCounter(now, 1);
            }
            return new WindowCounter(existing.windowStartEpochSeconds(), existing.count() + 1);
        });

        if (counter.count() > limit) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"message\":\"Too many requests. Please slow down.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private int resolveLimit(String path) {
        if (path.startsWith("/api/auth/")) {
            return 20;
        }
        if (path.startsWith("/api/chat/")) {
            return 60;
        }
        if (path.startsWith("/api/reviews/")) {
            return 20;
        }
        return 0;
    }

    private String pathGroup(String path) {
        if (path.startsWith("/api/auth/")) {
            return "auth";
        }
        if (path.startsWith("/api/chat/")) {
            return "chat";
        }
        if (path.startsWith("/api/reviews/")) {
            return "reviews";
        }
        return path;
    }

    private record WindowCounter(long windowStartEpochSeconds, int count) {}
}
