package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.model.AuditLog;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
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

    public AuditLogController(AuditLogRepository auditLogRepository, UserService userService) {
        this.auditLogRepository = auditLogRepository;
        this.userService = userService;
    }

    private void requireAdmin(HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
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
        Page<AuditLog> logPage = auditLogRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(page, Math.min(size, 200)));
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
    public ApiResponse<Void> addLog(@RequestBody Map<String, String> body, HttpServletRequest request) {
        requireAdmin(request);
        String username = (String) request.getAttribute("currentUsername");
        AuditLog log = new AuditLog();
        log.setUsername(username);
        log.setAction(body.getOrDefault("action", "UNKNOWN"));
        log.setDetail(body.get("detail"));
        auditLogRepository.save(log);
        return ApiResponse.success("日志已记录", null);
    }
}
