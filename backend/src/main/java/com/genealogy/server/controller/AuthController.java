package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.dto.LoginRequest;
import com.genealogy.server.dto.RegisterRequest;
import com.genealogy.server.model.AuditLog;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final AuditLogRepository auditLogRepository;

    public AuthController(UserService userService, AuditLogRepository auditLogRepository) {
        this.userService = userService;
        this.auditLogRepository = auditLogRepository;
    }

    @PostMapping("/register")
    public ApiResponse<User> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.register(request);
        user.setPassword(null);
        return ApiResponse.success("注册成功", user);
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, String>> login(@Valid @RequestBody LoginRequest request) {
        String token = userService.login(request);
        Map<String, String> data = new HashMap<>();
        data.put("token", token);
        data.put("username", request.getUsername());
        userService.findByUsername(request.getUsername())
                .ifPresent(u -> data.put("role", u.getRole()));

        AuditLog log = new AuditLog();
        log.setUsername(request.getUsername());
        log.setAction("LOGIN");
        log.setDetail("用户登录");
        auditLogRepository.save(log);

        return ApiResponse.success("登录成功", data);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            userService.removeToken(authHeader.substring(7));
        }
        return ApiResponse.success("已退出登录", null);
    }

    @GetMapping("/me")
    public ApiResponse<Map<String, String>> me(HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        Map<String, String> data = new HashMap<>();
        data.put("username", username);
        userService.findByUsername(username)
                .ifPresent(u -> data.put("role", u.getRole()));
        return ApiResponse.success(data);
    }
}
