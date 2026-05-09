package com.genealogy.server.controller;

import com.genealogy.server.config.SecurityConfig;
import com.genealogy.server.config.WebConfig;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtAuthenticationFilter;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.security.LoginRateLimitFilter;
import com.genealogy.server.service.RefreshTokenService;
import com.genealogy.server.service.UserService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class)
@Import({WebConfig.class, SecurityConfig.class, JwtAuthenticationFilter.class, LoginRateLimitFilter.class})
class AuthControllerLogoutSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private RefreshTokenService refreshTokenService;

    @MockBean
    private AuditLogRepository auditLogRepository;

    @Test
    void logoutShouldRevokeRefreshCookieWithoutAccessToken() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .cookie(new Cookie("refresh_token", "refresh-123")))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("refresh_token=;")))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Path=/api")))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));

        verify(refreshTokenService).revokeRefreshToken("refresh-123");
    }
}
