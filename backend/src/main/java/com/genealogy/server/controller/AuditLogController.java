package com.genealogy.server.controller;

import com.genealogy.server.auth.CurrentUserResolver;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.dto.AuditLogRequest;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.exception.UnauthorizedException;
import com.genealogy.server.model.AuditLog;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/logs")
@Tag(name = "审计日志", description = "系统操作日志")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;
    private final UserService userService;
    private final CurrentUserResolver currentUserResolver;

    public AuditLogController(AuditLogRepository auditLogRepository, UserService userService,
                              CurrentUserResolver currentUserResolver) {
        this.auditLogRepository = auditLogRepository;
        this.userService = userService;
        this.currentUserResolver = currentUserResolver;
    }

    private void requireAdmin(HttpServletRequest request) {
        String username = currentUserResolver.authenticatedUsername(request);
        if (username == null) {
            throw new UnauthorizedException("未登录或登录已过期");
        }
        if (!userService.isAdmin(username)) {
            throw new ForbiddenException("需要管理员权限");
        }
    }

    @Operation(summary = "获取操作日志", description = "分页获取系统操作日志列表")
    @GetMapping
    public ApiResponse<List<Map<String, Object>>> listLogs(
            @Parameter(description = "页码，从0开始") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "每页条数，最大200") @RequestParam(defaultValue = "50") int size,
            HttpServletRequest request) {
        requireAdmin(request);
        if (page < 0 || size < 1 || size > 200) {
            throw new BadRequestException("分页参数无效：页码不能小于 0，每页条数必须为 1～200");
        }
        Page<AuditLog> logPage = auditLogRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(page, size));
        List<Map<String, Object>> logs = logPage.getContent().stream()
                .map(log -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("id", log.getId());
                    m.put("username", log.getUsername());
                    m.put("action", log.getAction());
                    m.put("detail", log.getDetail());
                    m.put("createdAt", log.getCreatedAt());
                    return m;
                })
                .collect(Collectors.toList());
        return ApiResponse.success(logs);
    }

    @Operation(summary = "添加操作日志", description = "手动添加一条操作日志")
    @PostMapping
    public ApiResponse<Void> addLog(@Valid @RequestBody(required = false) AuditLogRequest body, HttpServletRequest request) {
        requireAdmin(request);
        if (body == null) {
            throw new BadRequestException("请求体不能为空");
        }
        String username = currentUserResolver.authenticatedUsername(request);
        AuditLog log = new AuditLog();
        log.setUsername(username);
        log.setAction(body.action() == null || body.action().isBlank() ? "UNKNOWN" : body.action());
        log.setDetail(body.detail());
        auditLogRepository.save(log);
        return ApiResponse.success("日志已记录", null);
    }
}
