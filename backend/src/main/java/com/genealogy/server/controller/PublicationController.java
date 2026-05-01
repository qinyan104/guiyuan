package com.genealogy.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.dto.PublicationSnapshot;
import com.genealogy.server.model.AuditLog;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/publications")
public class PublicationController {

    private final PublicationService publicationService;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public PublicationController(PublicationService publicationService, UserRepository userRepository,
                                 AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.publicationService = publicationService;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    private Long resolveUserId(HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        return user.getId();
    }

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(HttpServletRequest request) {
        Long userId = resolveUserId(request);
        return ApiResponse.success(publicationService.listPublications(userId));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> get(@PathVariable Long id, HttpServletRequest request) {
        resolveUserId(request); // 确保已登录
        return ApiResponse.success(publicationService.loadPublication(id));
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> create(@RequestBody PublicationSnapshot body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        Long userId = resolveUserId(request);
        String settingsJson = serializeSettings(body.getSettings());
        String infoJson = serializeSettings(body.getInfo());
        Long pubId = publicationService.createPublication(userId, body.getTitle(), body.getSubtitle(),
                body.getPublication(), settingsJson, infoJson);
        logAction(username, "CREATE_PUB", "创建族谱「" + (body.getTitle() != null ? body.getTitle() : "未命名") + "」", pubId);
        return ApiResponse.success("族谱已创建", Map.of("id", pubId));
    }

    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @RequestBody PublicationSnapshot body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        resolveUserId(request);
        String settingsJson = serializeSettings(body.getSettings());
        String infoJson = serializeSettings(body.getInfo());
        publicationService.updatePublication(id, body.getTitle(), body.getSubtitle(),
                body.getPublication(), settingsJson, infoJson);
        logAction(username, "UPDATE_PUB", "保存族谱「" + (body.getTitle() != null ? body.getTitle() : "未命名") + "」", id);
        return ApiResponse.success("族谱已保存", null);
    }

    @PutMapping("/{id}/metadata")
    public ApiResponse<Void> updateMetadata(@PathVariable Long id, @RequestBody com.genealogy.server.dto.UpdateMetadataRequest body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        resolveUserId(request);
        String infoJson = serializeSettings(body.getInfo());
        publicationService.updatePublicationMetadata(id, body.getTitle(), body.getSubtitle(), infoJson);
        logAction(username, "UPDATE_PUB_META", "更新族谱「" + (body.getTitle() != null ? body.getTitle() : "未命名") + "」的信息", id);
        return ApiResponse.success("族谱信息已更新", null);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        resolveUserId(request);
        publicationService.deletePublication(id);
        logAction(username, "DELETE_PUB", "删除族谱 #" + id, id);
        return ApiResponse.success("族谱已删除", null);
    }

    @GetMapping("/{id}/history")
    public ApiResponse<List<Map<String, Object>>> history(@PathVariable Long id, HttpServletRequest request) {
        resolveUserId(request);
        List<Map<String, Object>> logs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("publication", id)
                .stream()
                .limit(50)
                .map(log -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("id", log.getId());
                    m.put("username", log.getUsername());
                    m.put("action", log.getAction());
                    m.put("detail", log.getDetail());
                    m.put("createdAt", log.getCreatedAt());
                    return m;
                })
                .collect(java.util.stream.Collectors.toList());
        return ApiResponse.success(logs);
    }

    private void logAction(String username, String action, String detail, Long targetId) {
        AuditLog log = new AuditLog();
        log.setUsername(username);
        log.setAction(action);
        log.setDetail(detail);
        log.setTargetType("publication");
        log.setTargetId(targetId);
        auditLogRepository.save(log);
    }

    private String serializeSettings(Object settings) {
        if (settings == null) return null;
        try {
            return objectMapper.writeValueAsString(settings);
        } catch (Exception e) {
            return null;
        }
    }
}
