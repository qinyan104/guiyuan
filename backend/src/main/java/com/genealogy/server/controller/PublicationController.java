package com.genealogy.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.dto.PublicationSnapshot;
import com.genealogy.server.model.AuditLog;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import com.genealogy.server.service.ShareLinkService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/publications")
public class PublicationController {

    private final PublicationService publicationService;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;
    private final PublicationAuthorizationService authorizationService;
    private final ShareLinkService shareLinkService;
    private final com.genealogy.server.service.PublicationViewProjector viewProjector;

    public PublicationController(PublicationService publicationService, UserRepository userRepository,
                                 AuditLogRepository auditLogRepository, ObjectMapper objectMapper,
                                 PublicationAuthorizationService authorizationService,
                                 ShareLinkService shareLinkService,
                                 com.genealogy.server.service.PublicationViewProjector viewProjector) {
        this.publicationService = publicationService;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
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

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(HttpServletRequest request) {
        Long userId = resolveUserId(request);
        return ApiResponse.success(publicationService.listPublications(userId));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> get(@PathVariable Long id, HttpServletRequest request) {
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
    public ApiResponse<Map<String, Object>> update(@PathVariable Long id, @RequestBody PublicationSnapshot body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.EDIT);
        String settingsJson = serializeSettings(body.getSettings());
        String infoJson = serializeSettings(body.getInfo());
        Long newRevision = publicationService.updatePublication(id, body.getRevision(), body.getTitle(), body.getSubtitle(),
                body.getPublication(), settingsJson, infoJson);
        String personDiff = publicationService.getLastPersonDiff();
        String detail = (personDiff != null && !personDiff.equals("[]"))
                ? personDiff
                : "保存族谱「" + (body.getTitle() != null ? body.getTitle() : "未命名") + "」";
        logAction(username, "UPDATE_PUB", detail, id);
        return ApiResponse.success("族谱已保存", Map.of("newRevision", newRevision));
    }

    @PutMapping("/{id}/metadata")
    public ApiResponse<Map<String, Object>> updateMetadata(@PathVariable Long id, @RequestBody com.genealogy.server.dto.UpdateMetadataRequest body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.EDIT);
        String infoJson = serializeSettings(body.getInfo());
        Long newRevision = publicationService.updatePublicationMetadata(id, body.getRevision(), body.getTitle(), body.getSubtitle(), infoJson);
        logAction(username, "UPDATE_PUB_META", "更新族谱「" + (body.getTitle() != null ? body.getTitle() : "未命名") + "」的信息", id);
        return ApiResponse.success("族谱信息已更新", Map.of("newRevision", newRevision));
    }

    @PutMapping("/{pubId}/people/{personId}")
    public ApiResponse<Map<String, Object>> updatePerson(
            @PathVariable Long pubId,
            @PathVariable String personId,
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

        Long newRevision = publicationService.updatePerson(pubId, expectedRevision, personId, body);
        String personDiff = publicationService.getLastPersonDiff();
        String detail = (personDiff != null && !personDiff.equals("[]"))
                ? personDiff
                : "更新人物「" + body.getOrDefault("name", personId) + "」的详细信息";
        logAction(username, "UPDATE_PERSON", detail, pubId);
        return ApiResponse.success("个人信息已更新", Map.of("newRevision", newRevision));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.DELETE);
        publicationService.deletePublication(id);
        logAction(username, "DELETE_PUB", "删除族谱 #" + id, id);
        return ApiResponse.success("族谱已删除", null);
    }

    @GetMapping("/{id}/history")
    public ApiResponse<List<Map<String, Object>>> history(@PathVariable Long id, HttpServletRequest request) {
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

    @SuppressWarnings("unchecked")
    @PostMapping("/{id}/shares")
    public ApiResponse<Map<String, Object>> createShareLink(
            @PathVariable Long id,
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
        logAction(username, "CREATE_SHARE_LINK", "创建分享链接", id);
        return ApiResponse.success("分享链接已创建", result);
    }

    @GetMapping("/{id}/shares")
    public ApiResponse<List<Map<String, Object>>> listShareLinks(
            @PathVariable Long id,
            HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.MANAGE_SHARES);
        return ApiResponse.success(shareLinkService.listShareLinks(id));
    }

    @DeleteMapping("/{id}/shares/{shareId}")
    public ApiResponse<Void> revokeShareLink(
            @PathVariable Long id,
            @PathVariable Long shareId,
            HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.MANAGE_SHARES);
        shareLinkService.revokeShareLink(shareId, id);
        logAction(username, "REVOKE_SHARE_LINK", "撤销分享链接 #" + shareId, id);
        return ApiResponse.success("分享链接已撤销", null);
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
