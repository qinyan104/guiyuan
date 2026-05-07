package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.dto.LoginRequest;
import com.genealogy.server.dto.RegisterRequest;
import com.genealogy.server.model.AuditLog;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.RefreshTokenService;
import com.genealogy.server.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_COOKIE_NAME = "refresh_token";
    private static final String REFRESH_COOKIE_PATH = "/api/auth";
    private static final long REFRESH_COOKIE_MAX_AGE = 2592000L; // 30 days

    private final UserService userService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AuditLogRepository auditLogRepository;

    public AuthController(UserService userService,
                          JwtService jwtService,
                          RefreshTokenService refreshTokenService,
                          AuditLogRepository auditLogRepository) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.auditLogRepository = auditLogRepository;
    }

    @PostMapping("/register")
    public ApiResponse<User> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.register(request);
        user.setPassword(null);
        return ApiResponse.success("注册成功", user);
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, String>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {

        User user = userService.loginAndReturnUser(request);
        String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getRole());
        String refreshToken = refreshTokenService.createRefreshToken(user.getId());

        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(false) // set true in production with HTTPS
                .sameSite("Strict")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(REFRESH_COOKIE_MAX_AGE)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());

        Map<String, String> data = new HashMap<>();
        data.put("token", accessToken);
        data.put("username", user.getUsername());
        data.put("role", user.getRole());

        AuditLog log = new AuditLog();
        log.setUsername(user.getUsername());
        log.setAction("LOGIN");
        log.setDetail("用户登录");
        auditLogRepository.save(log);

        return ApiResponse.success("登录成功", data);
    }

    @PostMapping("/refresh")
    public ApiResponse<Map<String, String>> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = extractCookie(request, REFRESH_COOKIE_NAME);
        if (refreshToken == null) {
            return ApiResponse.error(401, "未登录");
        }

        var userIdOpt = refreshTokenService.validateRefreshToken(refreshToken);
        if (userIdOpt.isEmpty()) {
            clearRefreshCookie(response);
            return ApiResponse.error(401, "刷新令牌已过期或无效");
        }

        Long userId = userIdOpt.get();
        var userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            clearRefreshCookie(response);
            return ApiResponse.error(401, "用户不存在");
        }

        User user = userOpt.get();

        // Rotate: revoke old, issue new
        refreshTokenService.revokeRefreshToken(refreshToken);
        String newRefreshToken = refreshTokenService.createRefreshToken(user.getId());
        String newAccessToken = jwtService.generateAccessToken(user.getUsername(), user.getRole());

        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, newRefreshToken)
                .httpOnly(true)
                .secure(false)
                .sameSite("Strict")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(REFRESH_COOKIE_MAX_AGE)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());

        Map<String, String> data = new HashMap<>();
        data.put("token", newAccessToken);
        data.put("username", user.getUsername());
        data.put("role", user.getRole());

        return ApiResponse.success(data);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = extractCookie(request, REFRESH_COOKIE_NAME);
        if (refreshToken != null) {
            refreshTokenService.revokeRefreshToken(refreshToken);
        }
        clearRefreshCookie(response);
        return ApiResponse.success("已退出登录", null);
    }

    @GetMapping("/me")
    public ApiResponse<Map<String, String>> me(Authentication authentication) {
        String username = authentication.getName();
        Map<String, String> data = new HashMap<>();
        data.put("username", username);
        userService.findByUsername(username)
                .ifPresent(u -> data.put("role", u.getRole()));
        return ApiResponse.success(data);
    }

    private String extractCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Strict")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(0)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }
}
