package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.dto.ConsistencyReport;
import com.genealogy.server.dto.CreateUserRequest;
import com.genealogy.server.dto.ResetPasswordRequest;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.model.User;
import com.genealogy.server.service.AuditLogService;
import com.genealogy.server.service.BackupService;
import com.genealogy.server.service.ConsistencyService;
import com.genealogy.server.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "管理员", description = "管理员操作（用户管理、备份、一致性检查）")
public class AdminController {

    private final UserService userService;
    private final AuditLogService auditLogService;
    private final BackupService backupService;
    private final ConsistencyService consistencyService;
    private final long maxRestoreSizeBytes;

    public AdminController(UserService userService, AuditLogService auditLogService,
                           BackupService backupService, ConsistencyService consistencyService,
                           @Value("${app.backup.max-restore-size-bytes:524288000}") long maxRestoreSizeBytes) {
        this.userService = userService;
        this.auditLogService = auditLogService;
        this.backupService = backupService;
        this.consistencyService = consistencyService;
        this.maxRestoreSizeBytes = maxRestoreSizeBytes;
    }

    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

    @Operation(summary = "获取用户列表", description = "获取系统中所有用户的列表")
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
                    m.put("avatarUrl", userService.getAvatarUrl(u.getId()));
                    return m;
                })
                .toList();
        return ApiResponse.success(users);
    }

    @Operation(summary = "创建用户", description = "管理员创建新用户")
    @PostMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ApiResponse<User> createUser(@Valid @RequestBody CreateUserRequest body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        String role = body.getRole() != null ? body.getRole() : "USER";
        User user = userService.createUser(body.getUsername(), body.getPassword(), body.getNickname(), role);
        user.setPassword(null);

        auditLogService.record(username, "ADMIN_CREATE_USER",
                "创建用户「" + user.getUsername() + "」角色=" + role,
                "user", user.getId());

        return ApiResponse.success("用户创建成功", user);
    }

    @Operation(summary = "删除用户", description = "根据用户ID删除用户")
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ApiResponse<Void> deleteUser(@Parameter(description = "用户ID") @PathVariable Long id, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");

        User user = userService.findById(id).orElse(null);
        auditLogService.record(username, "ADMIN_DELETE_USER",
                "删除用户 #" + id + (user != null ? "「" + user.getUsername() + "」" : ""),
                "user", id);

        userService.deleteUser(id);
        return ApiResponse.success("用户已删除", null);
    }

    @Operation(summary = "重置用户密码", description = "管理员重置指定用户的密码")
    @PutMapping("/users/{id}/password")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ApiResponse<Void> resetPassword(@Parameter(description = "用户ID") @PathVariable Long id, @Valid @RequestBody ResetPasswordRequest body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");

        userService.resetPassword(id, body.getNewPassword());
        auditLogService.record(username, "ADMIN_RESET_PASSWORD",
                "重置用户 #" + id + " 的密码",
                "user", id);

        return ApiResponse.success("密码已重置", null);
    }

    @Operation(summary = "修改用户角色", description = "修改指定用户的角色")
    @PutMapping("/users/{id}/role")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Void> changeRole(@Parameter(description = "用户ID") @PathVariable Long id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        String newRole = body.get("role");
        if (newRole == null || newRole.isBlank()) {
            return ApiResponse.error(400, "角色不能为空");
        }
        userService.changeUserRole(id, newRole);
        auditLogService.record(username, "ADMIN_CHANGE_ROLE",
                "修改用户 #" + id + " 角色为 " + newRole,
                "user", id);

        return ApiResponse.success("角色已更新", null);
    }

    @Operation(summary = "批量删除用户", description = "根据ID列表批量删除用户")
    @PostMapping("/users/batch-delete")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ApiResponse<Map<String, Object>> batchDeleteUsers(@RequestBody Map<String, List<Long>> body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        List<Long> ids = body.get("ids");
        if (ids == null || ids.isEmpty()) {
            return ApiResponse.error(400, "请选择要删除的用户 IDs");
        }
        int deleted = userService.batchDeleteUsers(ids);
        auditLogService.record(username, "ADMIN_BATCH_DELETE_USERS",
                "批量删除用户：成功 " + deleted + " 个，共请求 " + ids.size() + " 个",
                null, null);
        return ApiResponse.success("已删除 " + deleted + " 个用户",
                Map.of("deleted", deleted, "requested", ids.size()));
    }

    @Operation(summary = "备份数据库", description = "导出数据库备份文件")
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

            auditLogService.record(username, "BACKUP",
                    "数据库备份 " + (result.exitCode() == 0 ? "成功" : "失败(exit=" + result.exitCode() + ")"),
                    null, null);
        } catch (InterruptedException e) {
            auditLogService.record(username, "BACKUP_FAILED", "数据库备份失败：进程被中断", null, null);
            Thread.currentThread().interrupt();
            throw new IOException("备份进程被中断", e);
        } catch (IOException e) {
            auditLogService.record(username, "BACKUP_FAILED", "数据库备份失败", null, null);
            throw e;
        }
    }

    @Operation(summary = "检查数据一致性", description = "运行数据一致性检查并返回报告")
    @GetMapping("/check-consistency")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<ConsistencyReport> checkConsistency() {
        return ApiResponse.success(consistencyService.runCheck());
    }

    @Operation(summary = "还原数据库", description = "从SQL文件还原数据库")
    @PostMapping("/restore")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Map<String, String>> restoreDatabase(
            @Parameter(description = "SQL备份文件") @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        if (file.isEmpty()) {
            throw new BadRequestException("请选择要还原的 SQL 文件");
        }
        if (file.getSize() > maxRestoreSizeBytes) {
            throw new BadRequestException("备份文件不能超过 " + formatMegabytes(maxRestoreSizeBytes));
        }
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase(Locale.ROOT).endsWith(".sql")) {
            throw new BadRequestException("仅支持 .sql 格式的文件");
        }

        String username = (String) request.getAttribute("currentUsername");
        try {
            backupService.restoreDatabase(file.getInputStream());
            auditLogService.record(username, "RESTORE_DB", "从文件 " + filename + " 还原数据库", null, null);
            return ApiResponse.success("数据库已还原", Map.of("filename", filename));
        } catch (Exception e) {
            auditLogService.record(username, "RESTORE_DB_FAILED", "数据库还原失败：文件 " + filename, null, null);
            logger.error("数据库还原失败", e);
            throw new RuntimeException("数据库还原失败: " + e.getMessage(), e);
        }
    }

    private String formatMegabytes(long bytes) {
        long megabytes = Math.max(1, bytes / (1024 * 1024));
        return megabytes + "MB";
    }

}
