package com.genealogy.server.security;

import com.genealogy.server.repository.UserRepository;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JwtAuthenticationFilterCookieSessionTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doesNotAuthenticateRegularRequestFromRefreshCookieWhenBearerTokenIsMissing() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);
        UserRepository userRepository = mock(UserRepository.class);
        FilterChain filterChain = mock(FilterChain.class);

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, userRepository);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/publications");
        request.setCookies(new Cookie("refresh_token", "refresh-123"));

        filter.doFilter(request, new MockHttpServletResponse(), filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(refreshTokenService, never()).validateRefreshToken("refresh-123");
        verify(userRepository, never()).findById(7L);
        verify(filterChain).doFilter(org.mockito.ArgumentMatchers.eq(request), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void stillAuthenticatesRequestFromValidBearerToken() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);
        UserRepository userRepository = mock(UserRepository.class);
        FilterChain filterChain = mock(FilterChain.class);

        com.genealogy.server.model.User user = new com.genealogy.server.model.User();
        user.setId(7L);
        user.setUsername("alice");
        user.setRole("ADMIN");

        when(jwtService.isTokenValid("access-123")).thenReturn(true);
        when(jwtService.extractUsername("access-123")).thenReturn("alice");
        when(jwtService.extractRole("access-123")).thenReturn("ADMIN");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, userRepository);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/publications");
        request.addHeader("Authorization", "Bearer access-123");

        filter.doFilter(request, new MockHttpServletResponse(), filterChain);

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authentication).isNotNull();
        assertThat(authentication.getName()).isEqualTo("alice");
        assertThat(authentication.getAuthorities())
                .anySatisfy(authority -> assertThat(authority.getAuthority()).isEqualTo("ROLE_ADMIN"));
    }
}
