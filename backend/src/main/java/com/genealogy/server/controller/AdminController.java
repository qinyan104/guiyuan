package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.dto.CreateUserRequest;
import com.genealogy.server.dto.ResetPasswordRequest;
import com.genealogy.server.model.AuditLog;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserService userService;
    private final AuditLogRepository auditLogRepository;

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Value("${spring.datasource.username}")
    private String datasourceUsername;

    @Value("${spring.datasource.password}")
    private String datasourcePassword;

    public AdminController(UserService userService, AuditLogRepository auditLogRepository) {
        this.userService = userService;
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ApiResponse<List<Map<String, Object>>> listUsers() {
        List<Map<String, Object>> users = userService.listAllUsers().stream()
                .map(u -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("username", u.getUsername());
                    m.put("nickname", u.getNickname());
                    m.put("role", u.getRole());
                    m.put("createdAt", u.getCreatedAt());
                    return m;
                })
                .collect(Collectors.toList());
        return ApiResponse.success(users);
    }

    @PostMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ApiResponse<User> createUser(@Valid @RequestBody CreateUserRequest body) {
        String role = body.getRole() != null ? body.getRole() : "USER";
        User user = userService.createUser(body.getUsername(), body.getPassword(), body.getNickname(), role);
        user.setPassword(null);
        return ApiResponse.success("用户创建成功", user);
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ApiResponse<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ApiResponse.success("用户已删除", null);
    }

    @PutMapping("/users/{id}/password")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ApiResponse<Void> resetPassword(@PathVariable Long id, @Valid @RequestBody ResetPasswordRequest body) {
        userService.resetPassword(id, body.getNewPassword());
        return ApiResponse.success("密码已重置", null);
    }

    @PutMapping("/users/{id}/role")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Void> changeRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newRole = body.get("role");
        if (newRole == null || newRole.isBlank()) {
            return ApiResponse.error(400, "角色不能为空");
        }
        userService.changeUserRole(id, newRole);
        return ApiResponse.success("角色已更新", null);
    }

    @GetMapping("/backup")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void backupDatabase(Authentication authentication, HttpServletResponse response) throws IOException {
        String username = authentication.getName();

        String dbName = extractDbName(datasourceUrl);
        String host = extractHost(datasourceUrl);
        int port = extractPort(datasourceUrl);

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename = "genealogy_backup_" + timestamp + ".sql";

        response.setContentType("application/octet-stream");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");

        ProcessBuilder pb = new ProcessBuilder(
            "mysqldump",
            "-h" + host,
            "-P" + port,
            "-u" + datasourceUsername,
            "--default-character-set=utf8mb4",
            "--single-transaction",
            "--routines",
            "--triggers",
            dbName
        );
        pb.environment().put("MYSQL_PWD", datasourcePassword);
        pb.redirectErrorStream(false);

        Process process = pb.start();
        int exitCode;
        try (var in = process.getInputStream()) {
            in.transferTo(response.getOutputStream());
            exitCode = process.waitFor();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("备份进程被中断", e);
        }
        response.getOutputStream().flush();

        AuditLog log = new AuditLog();
        log.setUsername(username);
        log.setAction("BACKUP");
        log.setDetail("数据库备份 " + (exitCode == 0 ? "成功" : "失败(exit=" + exitCode + ")"));
        auditLogRepository.save(log);
    }

    private String extractDbName(String url) {
        int slash = url.lastIndexOf('/');
        int q = url.indexOf('?', slash);
        return q > 0 ? url.substring(slash + 1, q) : url.substring(slash + 1);
    }

    private String extractHost(String url) {
        String afterScheme = url.substring(url.indexOf("://") + 3);
        int c = afterScheme.indexOf(':');
        int s = afterScheme.indexOf('/');
        return c > 0 && c < s ? afterScheme.substring(0, c) : afterScheme.substring(0, s);
    }

    private int extractPort(String url) {
        String afterScheme = url.substring(url.indexOf("://") + 3);
        int c = afterScheme.indexOf(':');
        int s = afterScheme.indexOf('/');
        if (c > 0 && c < s) {
            return Integer.parseInt(afterScheme.substring(c + 1, s));
        }
        return 3306;
    }
}
