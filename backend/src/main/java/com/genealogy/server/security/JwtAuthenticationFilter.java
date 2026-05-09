package com.genealogy.server.security;

import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.RefreshTokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String REFRESH_COOKIE_NAME = "refresh_token";

    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   RefreshTokenService refreshTokenService,
                                   UserRepository userRepository) {
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            authenticateWithBearerToken(request);
        }

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            authenticateWithRefreshCookie(request);
        }

        filterChain.doFilter(request, response);
    }

    private void authenticateWithBearerToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return;
        }

        String jwt = authHeader.substring(7);
        if (!jwtService.isTokenValid(jwt)) {
            return;
        }

        String username = jwtService.extractUsername(jwt);
        String role = jwtService.extractRole(jwt);
        setAuthentication(request, username, role);
    }

    private void authenticateWithRefreshCookie(HttpServletRequest request) {
        String refreshToken = extractCookie(request, REFRESH_COOKIE_NAME);
        if (refreshToken == null) {
            return;
        }

        Optional<Long> userId = refreshTokenService.validateRefreshToken(refreshToken);
        if (userId.isEmpty()) {
            return;
        }

        userRepository.findById(userId.get())
                .ifPresent(user -> setAuthentication(request, user.getUsername(), user.getRole()));
    }

    private void setAuthentication(HttpServletRequest request, String username, String role) {
        if (username == null || SecurityContextHolder.getContext().getAuthentication() != null) {
            return;
        }

        request.setAttribute("currentUsername", username);
        List<SimpleGrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + (role != null ? role : "USER")));

        UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(username, null, authorities);
        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authToken);
    }

    private String extractCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }

        return null;
    }
}
