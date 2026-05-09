package com.genealogy.server.security;

import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.model.User;
import com.genealogy.server.service.RefreshTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtAuthenticationFilterCookieSessionTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void authenticatesRequestFromValidRefreshCookieWhenBearerTokenIsMissing() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);
        UserRepository userRepository = mock(UserRepository.class);
        FilterChain filterChain = mock(FilterChain.class);

        User user = new User();
        user.setId(7L);
        user.setUsername("alice");
        user.setRole("ADMIN");

        when(refreshTokenService.validateRefreshToken("refresh-123")).thenReturn(Optional.of(7L));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, refreshTokenService, userRepository);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/publications");
        request.setCookies(new Cookie("refresh_token", "refresh-123"));

        filter.doFilter(request, new MockHttpServletResponse(), filterChain);

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authentication).isNotNull();
        assertThat(authentication.getName()).isEqualTo("alice");
        assertThat(authentication.getAuthorities())
                .anySatisfy(authority -> assertThat(authority.getAuthority()).isEqualTo("ROLE_ADMIN"));
    }
}
