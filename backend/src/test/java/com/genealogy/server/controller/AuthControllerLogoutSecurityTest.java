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
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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

    @Test
    void registerShouldRejectWeakPassword() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\",\"password\":\"1234\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value(containsString("密码长度需为8-100位")));

        verify(userService, never()).register(any());
    }

    @Test
    void refreshShouldRotateValidRefreshCookieWithoutBearerToken() throws Exception {
        com.genealogy.server.model.User user = new com.genealogy.server.model.User();
        user.setId(7L);
        user.setUsername("alice");
        user.setRole("ADMIN");

        when(refreshTokenService.validateRefreshToken("refresh-123")).thenReturn(Optional.of(7L));
        when(userService.findById(7L)).thenReturn(Optional.of(user));
        when(refreshTokenService.createRefreshToken(7L)).thenReturn("refresh-456");
        when(jwtService.generateAccessToken("alice", "ADMIN")).thenReturn("access-456");

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("refresh_token", "refresh-123")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.token").value("access-456"))
                .andExpect(jsonPath("$.data.username").value("alice"))
                .andExpect(jsonPath("$.data.role").value("ADMIN"))
                .andExpect(header().stringValues("Set-Cookie", hasItem(containsString("refresh_token=refresh-456; Path=/api;"))));

        verify(refreshTokenService).revokeRefreshToken("refresh-123");
        verify(refreshTokenService).createRefreshToken(7L);
    }
}
