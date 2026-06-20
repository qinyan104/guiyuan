package com.genealogy.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.dto.PublicationSnapshot;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.AuditLogService;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import com.genealogy.server.service.ShareLinkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/publications")
@Tag(name = "族谱", description = "族谱 CRUD 操作")
public class PublicationController {

    private final PublicationService publicationService;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;
    private final PublicationAuthorizationService authorizationService;
    private final ShareLinkService shareLinkService;
    private final com.genealogy.server.service.PublicationViewProjector viewProjector;

    public PublicationController(PublicationService publicationService, UserRepository userRepository,
                                 AuditLogRepository auditLogRepository,
                                 AuditLogService auditLogService, ObjectMapper objectMapper,
                                 PublicationAuthorizationService authorizationService,
                                 ShareLinkService shareLinkService,
                                 com.genealogy.server.service.PublicationViewProjector viewProjector) {
        this.publicationService = publicationService;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
        this.authorizationService = authorizationService;
        this.shareLinkService = shareLinkService;
        this.viewProjector = viewProjector;
    }

    private User resolveCachedUser(HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        if (username == null) throw new RuntimeException("用户不存在");
        User cached = (User) request.getAttribute("cachedUser");
        if (cached != null && username.equals(cached.getUsername())) return cached;
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        request.setAttribute("cachedUser", user);
        return user;
    }

    private Long resolveUserId(HttpServletRequest request) {
        return resolveCachedUser(request).getId();
    }

    private UserSubject resolveSubject(HttpServletRequest request) {
        User user = resolveCachedUser(request);
        return new UserSubject(user.getId(), user.getRole(), user.getUsername());
    }

    @Operation(summary = "获取族谱列表", description = "获取当前用户的所有族谱")
    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(HttpServletRequest request) {
        Long userId = resolveUserId(request);
        return ApiResponse.success(publicationService.listPublications(userId));
    }

    @Operation(summary = "获取族谱详情", description = "根据ID获取族谱详细数据")
    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> get(@Parameter(description = "族谱ID") @PathVariable Long id, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.READ_FULL);
        try {
            Map<String, Object> data = publicationService.loadPublication(id);
            
            // Apply redaction if the user is a VIEWER
            Optional<com.genealogy.server.model.PublicationAccess> access = authorizationService.getAccess(subject.getUserId(), id);
            
            if (access.isPresent() && "VIEWER".equals(access.get().getRole())) {
                data = viewProjector.projectRedacted(data, access.get().getRedactionProfile(), null);
            }

            return ApiResponse.success(data);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(PublicationController.class).error("获取族谱 {} 失败: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @Operation(summary = "创建族谱", description = "创建新的族谱")
    @PostMapping
    public ApiResponse<Map<String, Object>> create(@RequestBody PublicationSnapshot body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        Long userId = resolveUserId(request);
        String settingsJson = serializeSettings(body.getSettings());
        String infoJson = serializeSettings(body.getInfo());
        Long pubId = publicationService.createPublication(userId, body.getTitle(), body.getSubtitle(),
                body.getPublication(), settingsJson, infoJson);
        auditLogService.record(username, "CREATE_PUB", "创建族谱「" + (body.getTitle() != null ? body.getTitle() : "未命名") + "」", pubId);
        return ApiResponse.success("族谱已创建", Map.of("id", pubId));
    }

    @Operation(summary = "更新族谱", description = "更新族谱数据和设置")
    @PutMapping("/{id}")
    public ApiResponse<Map<String, Object>> update(@Parameter(description = "族谱ID") @PathVariable Long id, @RequestBody PublicationSnapshot body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.EDIT);
        String settingsJson = serializeSettings(body.getSettings());
        String infoJson = serializeSettings(body.getInfo());
        var result = publicationService.updatePublication(id, body.getRevision(), body.getTitle(), body.getSubtitle(),
                body.getPublication(), settingsJson, infoJson);
        Long newRevision = result.newRevision();
        String personDiff = result.personDiff();
        String detail = (personDiff != null && !personDiff.equals("[]"))
                ? personDiff
                : "保存族谱「" + (body.getTitle() != null ? body.getTitle() : "未命名") + "」";
        auditLogService.record(username, "UPDATE_PUB", detail, id);
        return ApiResponse.success("族谱已保存", Map.of("newRevision", newRevision));
    }

    @Operation(summary = "更新族谱信息", description = "更新族谱的标题、副标题等元数据")
    @PutMapping("/{id}/metadata")
    public ApiResponse<Map<String, Object>> updateMetadata(@Parameter(description = "族谱ID") @PathVariable Long id, @RequestBody com.genealogy.server.dto.UpdateMetadataRequest body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.EDIT);
        String infoJson = serializeSettings(body.getInfo());
        Long newRevision = publicationService.updatePublicationMetadata(id, body.getRevision(), body.getTitle(), body.getSubtitle(), infoJson);
        auditLogService.record(username, "UPDATE_PUB_META", "更新族谱「" + (body.getTitle() != null ? body.getTitle() : "未命名") + "」的信息", id);
        return ApiResponse.success("族谱信息已更新", Map.of("newRevision", newRevision));
    }

    @Operation(summary = "更新人物信息", description = "更新族谱中指定人物的详细信息")
    @PutMapping("/{pubId}/people/{personId}")
    public ApiResponse<Map<String, Object>> updatePerson(
            @Parameter(description = "族谱ID") @PathVariable Long pubId,
            @Parameter(description = "人物ID") @PathVariable String personId,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, pubId, AccessPermission.EDIT);

        Long expectedRevision = null;
        Object rev = body.get("expectedRevision");
        if (rev instanceof Number num) {
            expectedRevision = num.longValue();
        } else if (rev instanceof String s && !s.isBlank()) {
            try {
                expectedRevision = Long.parseLong(s);
            } catch (NumberFormatException ignored) {}
        }

        var result = publicationService.updatePerson(pubId, expectedRevision, personId, body);
        Long newRevision = result.newRevision();
        String personDiff = result.personDiff();
        String detail = (personDiff != null && !personDiff.equals("[]"))
                ? personDiff
                : "更新人物「" + body.getOrDefault("name", personId) + "」的详细信息";
        auditLogService.record(username, "UPDATE_PERSON", detail, pubId);
        return ApiResponse.success("个人信息已更新", Map.of("newRevision", newRevision));
    }

    @Operation(summary = "删除族谱", description = "删除指定族谱")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@Parameter(description = "族谱ID") @PathVariable Long id, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.DELETE);
        publicationService.deletePublication(id);
        auditLogService.record(username, "DELETE_PUB", "删除族谱 #" + id, id);
        return ApiResponse.success("族谱已删除", null);
    }

    @Operation(summary = "获取族谱历史", description = "获取族谱的变更历史记录")
    @GetMapping("/{id}/history")
    public ApiResponse<List<Map<String, Object>>> history(@Parameter(description = "族谱ID") @PathVariable Long id, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.HISTORY_READ);
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

    @Operation(summary = "创建分享链接", description = "为族谱创建公开分享链接")
    @SuppressWarnings("unchecked")
    @PostMapping("/{id}/shares")
    public ApiResponse<Map<String, Object>> createShareLink(
            @Parameter(description = "族谱ID") @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.MANAGE_SHARES);

        boolean allowExport = Boolean.TRUE.equals(body.get("allowExport"));
        int expiresInDays = body.containsKey("expiresInDays") ? ((Number) body.get("expiresInDays")).intValue() : 30;
        Map<String, Object> redactionProfile = (Map<String, Object>) body.get("redactionProfile");

        Map<String, Object> result = shareLinkService.createShareLink(
                id, subject.getUserId(), allowExport, redactionProfile, Duration.ofDays(expiresInDays));
        auditLogService.record(username, "CREATE_SHARE_LINK", "创建分享链接", id);
        return ApiResponse.success("分享链接已创建", result);
    }

    @Operation(summary = "获取分享链接列表", description = "获取族谱的所有分享链接")
    @GetMapping("/{id}/shares")
    public ApiResponse<List<Map<String, Object>>> listShareLinks(
            @Parameter(description = "族谱ID") @PathVariable Long id,
            HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.MANAGE_SHARES);
        return ApiResponse.success(shareLinkService.listShareLinks(id));
    }

    @Operation(summary = "撤销分享链接", description = "撤销指定的分享链接")
    @DeleteMapping("/{id}/shares/{shareId}")
    public ApiResponse<Void> revokeShareLink(
            @Parameter(description = "族谱ID") @PathVariable Long id,
            @Parameter(description = "分享链接ID") @PathVariable Long shareId,
            HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.MANAGE_SHARES);
        shareLinkService.revokeShareLink(shareId, id);
        auditLogService.record(username, "REVOKE_SHARE_LINK", "撤销分享链接 #" + shareId, id);
        return ApiResponse.success("分享链接已撤销", null);
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
