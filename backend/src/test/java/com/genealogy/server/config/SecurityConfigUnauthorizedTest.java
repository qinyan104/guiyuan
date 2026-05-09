package com.genealogy.server.config;

import com.genealogy.server.controller.UserController;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtAuthenticationFilter;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.security.LoginRateLimitFilter;
import com.genealogy.server.service.RefreshTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UserController.class)
@Import({WebConfig.class, SecurityConfig.class, JwtAuthenticationFilter.class, LoginRateLimitFilter.class})
class SecurityConfigUnauthorizedTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    @Test
    void protectedApiShouldReturnUnauthorizedWhenNoTokenIsPresent() throws Exception {
        mockMvc.perform(get("/api/users/search?q=test"))
                .andExpect(status().isUnauthorized());
    }
}
