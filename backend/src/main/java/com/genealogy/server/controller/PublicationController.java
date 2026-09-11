package com.genealogy.server.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.CurrentUserResolver;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.dto.PublicationSnapshot;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.service.AuditLogService;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import com.genealogy.server.service.ShareLinkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/publications")
@Tag(name = "族谱", description = "族谱 CRUD 操作")
public class PublicationController {

    private static final Logger log = LoggerFactory.getLogger(PublicationController.class);
    private final PublicationService publicationService;
    private final CurrentUserResolver currentUserResolver;
    private final AuditLogRepository auditLogRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;
    private final PublicationAuthorizationService authorizationService;
    private final ShareLinkService shareLinkService;
    private final com.genealogy.server.service.PublicationViewProjector viewProjector;

    public PublicationController(PublicationService publicationService, CurrentUserResolver currentUserResolver,
                                 AuditLogRepository auditLogRepository,
                                 AuditLogService auditLogService, ObjectMapper objectMapper,
                                 PublicationAuthorizationService authorizationService,
                                 ShareLinkService shareLinkService,
                                 com.genealogy.server.service.PublicationViewProjector viewProjector) {
        this.publicationService = publicationService;
        this.currentUserResolver = currentUserResolver;
        this.auditLogRepository = auditLogRepository;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
        this.authorizationService = authorizationService;
        this.shareLinkService = shareLinkService;
        this.viewProjector = viewProjector;
    }

    @Operation(summary = "获取族谱列表", description = "获取当前用户的所有族谱")
    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(HttpServletRequest request) {
        Long userId = currentUserResolver.requireUserId(request);
        return ApiResponse.success(publicationService.listPublications(userId));
    }

    @Operation(summary = "获取族谱详情", description = "根据ID获取族谱详细数据")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> get(@Parameter(description = "族谱ID") @PathVariable Long id, HttpServletRequest request) {
        long startedAt = System.nanoTime();
        UserSubject subject = currentUserResolver.requireSubject(request);
        authorizationService.require(subject, id, AccessPermission.READ_FULL);
        long authMs = elapsedMillis(startedAt);
        try {
            Optional<com.genealogy.server.model.PublicationAccess> access = authorizationService.getAccess(subject.getUserId(), id);
            String variant = access.filter(item -> "VIEWER".equals(item.getRole()))
                    .map(item -> "VIEWER:" + item.getRedactionProfile())
                    .orElse("FULL");

            String ifNoneMatch = request.getHeader("If-None-Match");
            if (ifNoneMatch != null && !ifNoneMatch.isBlank()) {
                long revision = publicationService.getPublicationRevision(id);
                String etag = buildEtag(id, revision, variant);
                long revisionMs = elapsedMillis(startedAt) - authMs;
                if (matchesEtag(ifNoneMatch, etag)) {
                    return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                            .eTag(etag)
                            .header("Cache-Control", "private, no-cache")
                            .header("Server-Timing", serverTiming(authMs, revisionMs, 0, elapsedMillis(startedAt)))
                            .build();
                }
            }

            Map<String, Object> data = publicationService.loadPublication(id);
            long loadMs = elapsedMillis(startedAt) - authMs;
            long redactStartedAt = System.nanoTime();

            // Apply redaction if the user is a VIEWER
            if (access.isPresent() && "VIEWER".equals(access.get().getRole())) {
                data = viewProjector.projectRedacted(data, access.get().getRedactionProfile(), null);
            }

            Object revisionValue = data.get("revision");
            long revision = revisionValue instanceof Number number
                    ? number.longValue()
                    : publicationService.getPublicationRevision(id);
            String etag = buildEtag(id, revision, variant);
            long redactMs = elapsedMillis(redactStartedAt);
            return ResponseEntity.ok()
                    .eTag(etag)
                    .header("Cache-Control", "private, no-cache")
                    .header("Server-Timing", serverTiming(authMs, loadMs, redactMs, elapsedMillis(startedAt)))
                    .body(ApiResponse.success(data));
        } catch (Exception e) {
            log.error("获取族谱 {} 失败: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    private String buildEtag(Long publicationId, long revision, String variant) {
        return "\"publication-" + publicationId + "-" + revision + "-" + sha256(variant) + "\"";
    }

    private boolean matchesEtag(String header, String etag) {
        for (String candidate : header.split(",")) {
            String value = candidate.trim();
            if ("*".equals(value) || etag.equals(value) || ("W/" + etag).equals(value)) {
                return true;
            }
        }
        return false;
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    private String serverTiming(long authMs, long loadMs, long redactMs, long totalMs) {
        return "auth;dur=" + authMs
                + ", load;dur=" + loadMs
                + ", redact;dur=" + redactMs
                + ", total;dur=" + totalMs;
    }

    private long elapsedMillis(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }

    @Operation(summary = "创建族谱", description = "创建新的族谱")
    @PostMapping
    public ApiResponse<Map<String, Object>> create(@RequestBody PublicationSnapshot body, HttpServletRequest request) {
        String username = currentUserResolver.requireUser(request).getUsername();
        Long userId = currentUserResolver.requireUserId(request);
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
        String username = currentUserResolver.requireUser(request).getUsername();
        UserSubject subject = currentUserResolver.requireSubject(request);
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
        String username = currentUserResolver.requireUser(request).getUsername();
        UserSubject subject = currentUserResolver.requireSubject(request);
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
        String username = currentUserResolver.requireUser(request).getUsername();
        UserSubject subject = currentUserResolver.requireSubject(request);
        authorizationService.require(subject, pubId, AccessPermission.EDIT);
        if (body == null) {
            throw new BadRequestException("人物更新内容不能为空");
        }

        Long expectedRevision = resolveExpectedRevision(body);
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
        String username = currentUserResolver.requireUser(request).getUsername();
        UserSubject subject = currentUserResolver.requireSubject(request);
        authorizationService.require(subject, id, AccessPermission.DELETE);
        publicationService.deletePublication(id);
        auditLogService.record(username, "DELETE_PUB", "删除族谱 #" + id, id);
        return ApiResponse.success("族谱已删除", null);
    }

    @Operation(summary = "获取族谱历史", description = "获取族谱的变更历史记录")
    @GetMapping("/{id}/history")
    public ApiResponse<List<Map<String, Object>>> history(@Parameter(description = "族谱ID") @PathVariable Long id, HttpServletRequest request) {
        UserSubject subject = currentUserResolver.requireSubject(request);
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
        String username = currentUserResolver.requireUser(request).getUsername();
        UserSubject subject = currentUserResolver.requireSubject(request);
        authorizationService.require(subject, id, AccessPermission.MANAGE_SHARES);

        Map<String, Object> payload = body != null ? body : Map.of();
        boolean allowExport = Boolean.TRUE.equals(payload.get("allowExport"));
        int expiresInDays = resolveExpiresInDays(payload);
        Object rawRedactionProfile = payload.get("redactionProfile");
        if (rawRedactionProfile != null && !(rawRedactionProfile instanceof Map<?, ?>)) {
            throw new BadRequestException("分享脱敏配置必须是对象");
        }
        Map<String, Object> redactionProfile = (Map<String, Object>) rawRedactionProfile;

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
        UserSubject subject = currentUserResolver.requireSubject(request);
        authorizationService.require(subject, id, AccessPermission.MANAGE_SHARES);
        return ApiResponse.success(shareLinkService.listShareLinks(id));
    }

    @Operation(summary = "撤销分享链接", description = "撤销指定的分享链接")
    @DeleteMapping("/{id}/shares/{shareId}")
    public ApiResponse<Void> revokeShareLink(
            @Parameter(description = "族谱ID") @PathVariable Long id,
            @Parameter(description = "分享链接ID") @PathVariable Long shareId,
            HttpServletRequest request) {
        String username = currentUserResolver.requireUser(request).getUsername();
        UserSubject subject = currentUserResolver.requireSubject(request);
        authorizationService.require(subject, id, AccessPermission.MANAGE_SHARES);
        shareLinkService.revokeShareLink(shareId, id);
        auditLogService.record(username, "REVOKE_SHARE_LINK", "撤销分享链接 #" + shareId, id);
        return ApiResponse.success("分享链接已撤销", null);
    }

    /**
     * 解析分享链接有效期（天）。缺失、为 null、空白或非数字时统一回退到 30 天，
     * 避免 {@code null}/非法输入触发 500。
     */
    static Long resolveExpectedRevision(Map<String, Object> body) {
        if (body == null || !body.containsKey("expectedRevision") || body.get("expectedRevision") == null) {
            return null;
        }
        Object raw = body.get("expectedRevision");
        if (raw instanceof Number number) {
            return number.longValue();
        }
        if (raw instanceof String text && !text.isBlank()) {
            try {
                return Long.parseLong(text.trim());
            } catch (NumberFormatException ignored) {
                // 统一按非法 revision 拒绝请求
            }
        }
        throw new BadRequestException("expectedRevision 必须是整数");
    }

    static int resolveExpiresInDays(Map<String, Object> body) {
        Object raw = body == null ? null : body.get("expiresInDays");
        Integer days = null;
        if (raw instanceof Number number) {
            days = number.intValue();
        } else if (raw instanceof String text && !text.isBlank()) {
            try {
                days = Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                // 回退到默认值
            }
        }
        return days != null && days >= 1 && days <= 365 ? days : 30;
    }

    private String serializeSettings(Object settings) {
        if (settings == null) return null;
        try {
            return objectMapper.writeValueAsString(settings);
        } catch (JsonProcessingException e) {
            // 静默返回 null 会让用户提交的设置无声丢失，也无法从日志定位，这里直接失败。
            throw new IllegalStateException("族谱设置无法序列化为 JSON", e);
        }
    }
}
