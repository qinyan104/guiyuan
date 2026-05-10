package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.dto.CreateUserRequest;
import com.genealogy.server.dto.ResetPasswordRequest;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.model.AuditLog;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.service.BackupService;
import com.genealogy.server.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserService userService;
    private final AuditLogRepository auditLogRepository;
    private final BackupService backupService;

    public AdminController(UserService userService, AuditLogRepository auditLogRepository,
                           BackupService backupService) {
        this.userService = userService;
        this.auditLogRepository = auditLogRepository;
        this.backupService = backupService;
    }

    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

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
                .toList();
        return ApiResponse.success(users);
    }

    @PostMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ApiResponse<User> createUser(@Valid @RequestBody CreateUserRequest body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        String role = body.getRole() != null ? body.getRole() : "USER";
        User user = userService.createUser(body.getUsername(), body.getPassword(), body.getNickname(), role);
        user.setPassword(null);

        saveAuditLog(username, "ADMIN_CREATE_USER",
                "创建用户「" + user.getUsername() + "」角色=" + role,
                "user", user.getId());

        return ApiResponse.success("用户创建成功", user);
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ApiResponse<Void> deleteUser(@PathVariable Long id, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");

        User user = userService.findById(id).orElse(null);
        saveAuditLog(username, "ADMIN_DELETE_USER",
                "删除用户 #" + id + (user != null ? "「" + user.getUsername() + "」" : ""),
                "user", id);

        userService.deleteUser(id);
        return ApiResponse.success("用户已删除", null);
    }

    @PutMapping("/users/{id}/password")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ApiResponse<Void> resetPassword(@PathVariable Long id, @Valid @RequestBody ResetPasswordRequest body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");

        userService.resetPassword(id, body.getNewPassword());
        saveAuditLog(username, "ADMIN_RESET_PASSWORD",
                "重置用户 #" + id + " 的密码",
                "user", id);

        return ApiResponse.success("密码已重置", null);
    }

    @PutMapping("/users/{id}/role")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Void> changeRole(@PathVariable Long id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        String newRole = body.get("role");
        if (newRole == null || newRole.isBlank()) {
            return ApiResponse.error(400, "角色不能为空");
        }
        userService.changeUserRole(id, newRole);
        saveAuditLog(username, "ADMIN_CHANGE_ROLE",
                "修改用户 #" + id + " 角色为 " + newRole,
                "user", id);

        return ApiResponse.success("角色已更新", null);
    }

    @GetMapping("/backup")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void backupDatabase(Authentication authentication, HttpServletResponse response) throws IOException {
        String username = authentication.getName();

        try {
            BackupService.BackupResult result = backupService.runBackup();

            response.setContentType("application/octet-stream");
            response.setHeader("Content-Disposition", "attachment; filename=\"" + result.filename() + "\"");

            try (var in = result.inputStream()) {
                in.transferTo(response.getOutputStream());
            }
            response.getOutputStream().flush();

            saveAuditLog(username, "BACKUP",
                    "数据库备份 " + (result.exitCode() == 0 ? "成功" : "失败(exit=" + result.exitCode() + ")"),
                    null, null);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("备份进程被中断", e);
        }
    }

    @PostMapping("/restore")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Map<String, String>> restoreDatabase(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        if (file.isEmpty()) {
            throw new BadRequestException("请选择要还原的 SQL 文件");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.endsWith(".sql")) {
            throw new BadRequestException("仅支持 .sql 格式的文件");
        }

        String username = (String) request.getAttribute("currentUsername");
        try {
            backupService.restoreDatabase(file.getInputStream());
            saveAuditLog(username, "RESTORE_DB", "从文件 " + filename + " 还原数据库", null, null);
            return ApiResponse.success("数据库已还原", Map.of("filename", filename));
        } catch (Exception e) {
            logger.error("数据库还原失败", e);
            throw new RuntimeException("数据库还原失败: " + e.getMessage(), e);
        }
    }

    private void saveAuditLog(String username, String action, String detail, String targetType, Long targetId) {
        AuditLog log = new AuditLog();
        log.setUsername(username);
        log.setAction(action);
        log.setDetail(detail);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        auditLogRepository.save(log);
    }
}
