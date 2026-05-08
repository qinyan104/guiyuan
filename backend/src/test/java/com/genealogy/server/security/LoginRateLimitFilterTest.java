package com.genealogy.server.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class LoginRateLimitFilterTest {

    private static final int IP_LIMIT = 10;
    private static final String LOGIN_PATH = "/api/auth/login";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private LoginRateLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new LoginRateLimitFilter(objectMapper);
    }

    @Test
    void nonLoginRequest_passesThrough() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/publications");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);
        assertThat(response.getStatus()).isNotEqualTo(429);
    }

    @Test
    void loginGetRequest_passesThrough() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", LOGIN_PATH);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);
        assertThat(response.getStatus()).isNotEqualTo(429);
    }

    @Test
    void loginPost_withinLimit_passesThrough() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", LOGIN_PATH);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);
        assertThat(response.getStatus()).isNotEqualTo(429);
    }

    @Test
    void loginPost_exceedsLimit_returns429() throws Exception {
        // Simulate 10 failed login attempts from the same IP
        for (int i = 0; i < IP_LIMIT; i++) {
            attemptFailedLogin("192.168.1.1");
        }

        // 11th attempt should be blocked
        MockHttpServletRequest request = createLoginRequest("192.168.1.1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertThat(response.getStatus()).isEqualTo(429);
    }

    @Test
    void loginPost_blockedRequest_returnsRateLimitBody() throws Exception {
        for (int i = 0; i < IP_LIMIT; i++) {
            attemptFailedLogin("10.0.0.1");
        }

        MockHttpServletRequest request = createLoginRequest("10.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getContentType()).contains("application/json");
        assertThat(response.getContentAsString()).contains("登录尝试过于频繁");
    }

    @Test
    void differentIps_haveIndependentCounters() throws Exception {
        // Exhaust IP A's limit
        for (int i = 0; i < IP_LIMIT; i++) {
            attemptFailedLogin("192.168.1.1");
        }

        // IP B should still be allowed
        MockHttpServletRequest request = createLoginRequest("10.0.0.2");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertThat(response.getStatus()).isNotEqualTo(429);
    }

    @Test
    void xForwardedForHeader_usedForIpResolution() throws Exception {
        // Simulate failed attempts using X-Forwarded-For header
        for (int i = 0; i < IP_LIMIT; i++) {
            MockHttpServletRequest req = createLoginRequest(null);
            req.addHeader("X-Forwarded-For", "203.0.113.5");
            MockHttpServletResponse resp = new MockHttpServletResponse();
            resp.setStatus(400);
            filter.doFilter(req, resp, new MockFilterChain());
        }

        // Next request from that IP should be blocked
        MockHttpServletRequest request = createLoginRequest(null);
        request.addHeader("X-Forwarded-For", "203.0.113.5");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertThat(response.getStatus()).isEqualTo(429);
    }

    @Test
    void successfulLogin_doesNotCountTowardsLimit() throws Exception {
        // Make requests with 200 status (successful login) — should not be counted
        for (int i = 0; i < IP_LIMIT * 2; i++) {
            MockHttpServletRequest req = createLoginRequest("192.168.1.2");
            MockHttpServletResponse resp = new MockHttpServletResponse();
            resp.setStatus(200); // Success
            filter.doFilter(req, resp, new MockFilterChain());
        }

        // Should not be blocked
        MockHttpServletRequest request = createLoginRequest("192.168.1.2");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertThat(response.getStatus()).isNotEqualTo(429);
    }

    // --- helpers ---

    private void attemptFailedLogin(String ip) throws Exception {
        MockHttpServletRequest req = createLoginRequest(ip);
        MockHttpServletResponse resp = new MockHttpServletResponse();
        resp.setStatus(400); // Simulate failed login response
        filter.doFilter(req, resp, new MockFilterChain());
    }

    private MockHttpServletRequest createLoginRequest(String ip) {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", LOGIN_PATH);
        if (ip != null) {
            req.setRemoteAddr(ip);
        }
        return req;
    }
}
