package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.AuditLogService;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/publications/{id}/access")
public class PublicationAccessController {

    private static final Set<String> ALLOWED_ROLES = Set.of("EDITOR", "VIEWER");

    private final PublicationAuthorizationService authorizationService;
    private final PublicationAccessRepository accessRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final PublicationService publicationService;

    public PublicationAccessController(PublicationAuthorizationService authorizationService,
                                       PublicationAccessRepository accessRepository,
                                       UserRepository userRepository,
                                       AuditLogService auditLogService,
                                       PublicationService publicationService) {
        this.authorizationService = authorizationService;
        this.accessRepository = accessRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.publicationService = publicationService;
    }

    private User resolveCachedUser(HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        if (username == null) throw new ForbiddenException("未登录");
        User cached = (User) request.getAttribute("cachedUser");
        if (cached != null && username.equals(cached.getUsername())) return cached;
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ForbiddenException("未登录"));
        request.setAttribute("cachedUser", user);
        return user;
    }

    private UserSubject resolveSubject(HttpServletRequest request) {
        User user = resolveCachedUser(request);
        return new UserSubject(user.getId(), user.getRole(), user.getUsername());
    }

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> listAccess(@PathVariable Long id, HttpServletRequest request) {
        authorizationService.require(resolveSubject(request), id, AccessPermission.MANAGE_ACCESS);

        List<Map<String, Object>> result = accessRepository.findByPublicationId(id).stream().map(access -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", access.getId());
            m.put("userId", access.getUserId());
            m.put("role", access.getRole());
            m.put("redactionProfile", access.getRedactionProfile());
            m.put("createdAt", access.getCreatedAt());
            userRepository.findById(access.getUserId()).ifPresent(u -> {
                m.put("username", u.getUsername());
                m.put("nickname", u.getNickname() != null ? u.getNickname() : u.getUsername());
            });
            return m;
        }).toList();

        return ApiResponse.success(result);
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> addAccess(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.MANAGE_ACCESS);

        Long targetUserId = ((Number) body.get("userId")).longValue();
        String role = (String) body.get("role");

        if (!ALLOWED_ROLES.contains(role)) {
            throw new BadRequestException("角色必须是 EDITOR 或 VIEWER");
        }

        if (targetUserId.equals(subject.getUserId())) {
            throw new BadRequestException("不能将自己添加为协作者");
        }

        if (accessRepository.findByPublicationIdAndUserId(id, targetUserId).isPresent()) {
            throw new BadRequestException("该用户已是协作者");
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new BadRequestException("用户不存在"));

        PublicationAccess access = new PublicationAccess();
        access.setPublicationId(id);
        access.setUserId(targetUserId);
        access.setRole(role);
        access.setRedactionProfile((String) body.get("redactionProfile"));
        access.setCreatedBy(subject.getUserId());
        access = accessRepository.save(access);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", access.getId());

        auditLogService.record(username, "ADD_COLLABORATOR",
                "添加协作者「" + targetUser.getUsername() + "」角色为 " + role, id);
        return ApiResponse.success("协作者已添加", result);
    }

    @PutMapping("/{userId}")
    public ApiResponse<Void> updateAccess(@PathVariable Long id, @PathVariable Long userId,
                                          @RequestBody Map<String, Object> body, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.MANAGE_ACCESS);

        String newRole = (String) body.get("role");
        if (!ALLOWED_ROLES.contains(newRole)) {
            throw new BadRequestException("角色必须是 EDITOR 或 VIEWER");
        }

        PublicationAccess access = accessRepository.findByPublicationIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("找不到该用户的权限记录"));

        if (!ALLOWED_ROLES.contains(access.getRole())) {
            throw new BadRequestException("不能修改 OWNER 角色");
        }

        access.setRole(newRole);
        if (body.containsKey("redactionProfile")) {
            access.setRedactionProfile((String) body.get("redactionProfile"));
        }
        accessRepository.save(access);

        auditLogService.record(username, "UPDATE_COLLABORATOR_ROLE",
                "修改协作者角色为 " + newRole + (body.containsKey("redactionProfile") ? ", 脱敏配置: " + body.get("redactionProfile") : ""), id);
        return ApiResponse.success("角色及配置已更新", null);
    }

    @DeleteMapping("/{userId}")
    public ApiResponse<Void> removeAccess(@PathVariable Long id, @PathVariable Long userId, HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.MANAGE_ACCESS);

        PublicationAccess access = accessRepository.findByPublicationIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("找不到该用户的权限记录"));

        if (!ALLOWED_ROLES.contains(access.getRole())) {
            throw new BadRequestException("不能移除 OWNER");
        }

        String targetUsername = userRepository.findById(access.getUserId())
                .map(User::getUsername)
                .orElse("未知用户");

        accessRepository.delete(access);

        auditLogService.record(username, "REMOVE_COLLABORATOR",
                "移除协作者「" + targetUsername + "」", id);
        return ApiResponse.success("协作者已移除", null);
    }

    @PostMapping("/{personId}/merge")
    public ApiResponse<Void> mergeBranch(@PathVariable Long id, @PathVariable String personId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, id, AccessPermission.MANAGE_ACCESS);
        publicationService.mergeBranch(id, personId, subject);
        return ApiResponse.success("分支已合并", null);
    }
}
