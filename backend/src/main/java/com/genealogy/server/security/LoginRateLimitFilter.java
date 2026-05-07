package com.genealogy.server.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.dto.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final int IP_LIMIT = 10;
    private static final long WINDOW_MS = 300_000; // 5 minutes
    private static final long BLOCK_MS = 900_000;  // 15 minutes

    private final ConcurrentMap<String, List<Instant>> ipAttempts = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Instant> ipBlocked = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper;

    public LoginRateLimitFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (!"POST".equals(request.getMethod()) || !request.getRequestURI().endsWith("/api/auth/login")) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = getClientIp(request);
        Instant now = Instant.now();

        // Check IP block
        Instant ipBlockExpiry = ipBlocked.get(ip);
        if (ipBlockExpiry != null && now.isBefore(ipBlockExpiry)) {
            writeRateLimitResponse(response, ipBlockExpiry);
            return;
        } else if (ipBlockExpiry != null) {
            ipBlocked.remove(ip);
        }

        filterChain.doFilter(request, response);

        // After the request, check if it was a failed login (400 status)
        if (response.getStatus() == HttpStatus.BAD_REQUEST.value()) {
            recordIpAttempt(ip, now);
        }
    }

    private void recordIpAttempt(String ip, Instant now) {
        List<Instant> attempts = ipAttempts.computeIfAbsent(ip, k -> new java.util.ArrayList<>());
        synchronized (attempts) {
            attempts.removeIf(t -> t.plusMillis(WINDOW_MS).isBefore(now));
            attempts.add(now);
            if (attempts.size() >= IP_LIMIT) {
                ipBlocked.put(ip, now.plusMillis(BLOCK_MS));
                attempts.clear();
            }
        }
    }

    private void writeRateLimitResponse(HttpServletResponse response, Instant blockExpiry) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json;charset=UTF-8");
        long secondsLeft = java.time.Duration.between(Instant.now(), blockExpiry).getSeconds();
        ApiResponse<?> body = ApiResponse.error(429, "登录尝试过于频繁，请 " + secondsLeft + " 秒后再试");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isEmpty()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().endsWith("/api/auth/login");
    }
}
