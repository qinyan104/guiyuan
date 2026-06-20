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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "认证", description = "用户登录、注册、刷新令牌")
public class AuthController {

    private static final String REFRESH_COOKIE_NAME = "refresh_token";
    private static final String REFRESH_COOKIE_PATH = "/api";
    private static final String LEGACY_REFRESH_COOKIE_PATH = "/api/auth";
    private static final long REFRESH_COOKIE_MAX_AGE = 2592000L; // 30 days

    private final UserService userService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AuditLogRepository auditLogRepository;
    private final boolean secureCookie;

    public AuthController(UserService userService,
                          JwtService jwtService,
                          RefreshTokenService refreshTokenService,
                          AuditLogRepository auditLogRepository,
                          @Value("${app.secure-cookie:false}") boolean secureCookie) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.auditLogRepository = auditLogRepository;
        this.secureCookie = secureCookie;
    }

    @Operation(summary = "用户注册", description = "注册新用户账号")
    @PostMapping("/register")
    public ApiResponse<User> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.register(request);
        user.setPassword(null);
        return ApiResponse.success("注册成功", user);
    }

    @Operation(summary = "用户登录", description = "用户登录并获取访问令牌和刷新令牌")
    @PostMapping("/login")
    public ApiResponse<Map<String, String>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {

        User user = userService.loginAndReturnUser(request);
        String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getRole());
        String refreshToken = refreshTokenService.createRefreshToken(user.getId());

        ResponseCookie cookie = buildRefreshCookie(refreshToken);
        clearRefreshCookie(response, LEGACY_REFRESH_COOKIE_PATH);
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

    @Operation(summary = "刷新访问令牌", description = "使用刷新令牌获取新的访问令牌")
    @PostMapping("/refresh")
    public ApiResponse<Map<String, String>> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = extractCookie(request, REFRESH_COOKIE_NAME);
        if (refreshToken == null) {
            // 兼容小程序：尝试从 Authorization 头读取 Refresh Token
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Refresh ")) {
                refreshToken = authHeader.substring(8);
            }
        }
        if (refreshToken == null) {
            return ApiResponse.error(401, "未登录");
        }

        var userIdOpt = refreshTokenService.validateRefreshToken(refreshToken);
        if (userIdOpt.isEmpty()) {
            clearRefreshCookie(response);
            clearRefreshCookie(response, LEGACY_REFRESH_COOKIE_PATH);
            return ApiResponse.error(401, "刷新令牌已过期或无效");
        }

        Long userId = userIdOpt.get();
        var userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            clearRefreshCookie(response);
            clearRefreshCookie(response, LEGACY_REFRESH_COOKIE_PATH);
            return ApiResponse.error(401, "用户不存在");
        }

        User user = userOpt.get();

        // Rotate: revoke old, issue new
        refreshTokenService.revokeRefreshToken(refreshToken);
        String newRefreshToken = refreshTokenService.createRefreshToken(user.getId());
        String newAccessToken = jwtService.generateAccessToken(user.getUsername(), user.getRole());

        ResponseCookie cookie = buildRefreshCookie(newRefreshToken);
        clearRefreshCookie(response, LEGACY_REFRESH_COOKIE_PATH);
        response.addHeader("Set-Cookie", cookie.toString());

        Map<String, String> data = new HashMap<>();
        data.put("token", newAccessToken);
        data.put("username", user.getUsername());
        data.put("role", user.getRole());

        return ApiResponse.success(data);
    }

    @Operation(summary = "用户登出", description = "撤销刷新令牌并清除Cookie")
    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = extractCookie(request, REFRESH_COOKIE_NAME);
        if (refreshToken != null) {
            refreshTokenService.revokeRefreshToken(refreshToken);
        }
        clearRefreshCookie(response);
        clearRefreshCookie(response, LEGACY_REFRESH_COOKIE_PATH);
        return ApiResponse.success("已退出登录", null);
    }

    @Operation(summary = "获取当前用户信息", description = "获取当前登录用户的用户名和角色")
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
        clearRefreshCookie(response, REFRESH_COOKIE_PATH);
    }

    private void clearRefreshCookie(HttpServletResponse response, String path) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Strict")
                .path(path)
                .maxAge(0)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    private ResponseCookie buildRefreshCookie(String token) {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Strict")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(REFRESH_COOKIE_MAX_AGE)
                .build();
    }
}
