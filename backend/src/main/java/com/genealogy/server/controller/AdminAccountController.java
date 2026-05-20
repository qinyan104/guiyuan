package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.AccountDerivationService;
import com.genealogy.server.service.PublicationAuthorizationService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/publications/{pubId}/accounts")
public class AdminAccountController {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountController.class);

    private final AccountDerivationService accountDerivationService;
    private final PublicationAuthorizationService authorizationService;
    private final UserRepository userRepository;

    public AdminAccountController(AccountDerivationService accountDerivationService,
                                  PublicationAuthorizationService authorizationService,
                                  UserRepository userRepository) {
        this.accountDerivationService = accountDerivationService;
        this.authorizationService = authorizationService;
        this.userRepository = userRepository;
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

    private void requireOwnerOrSuperAdmin(UserSubject subject, Long pubId) {
        if ("SUPER_ADMIN".equals(subject.getPlatformRole())) return;
        authorizationService.require(subject, pubId, AccessPermission.MANAGE_ACCESS);
    }

    @PostMapping("/derive")
    public ApiResponse<List<Map<String, Object>>> derive(@PathVariable Long pubId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        List<Map<String, Object>> created = accountDerivationService.deriveAccounts(pubId);
        return ApiResponse.success("已派生 " + created.size() + " 个账号", created);
    }

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(@PathVariable Long pubId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        return ApiResponse.success(accountDerivationService.listAccounts(pubId));
    }

    @PutMapping("/{personDbId}/disable")
    public ApiResponse<Void> disable(@PathVariable Long pubId, @PathVariable Long personDbId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        accountDerivationService.disableAccount(personDbId);
        return ApiResponse.success("账号已停用", null);
    }

    @PutMapping("/{personDbId}/enable")
    public ApiResponse<Void> enable(@PathVariable Long pubId, @PathVariable Long personDbId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        accountDerivationService.enableAccount(personDbId);
        return ApiResponse.success("账号已启用", null);
    }

    @PostMapping("/{personDbId}/reset-password")
    public ApiResponse<Map<String, String>> resetPassword(@PathVariable Long pubId, @PathVariable Long personDbId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        String newPassword = accountDerivationService.resetPassword(personDbId);
        return ApiResponse.success("密码已重置", Map.of("newPassword", newPassword));
    }

    @DeleteMapping("/{personDbId}")
    public ApiResponse<Void> deleteAccount(@PathVariable Long pubId, @PathVariable Long personDbId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        accountDerivationService.deleteAccount(pubId, personDbId);
        return ApiResponse.success("账号记录已删除", null);
    }

    @PostMapping("/batch-delete")
    public ApiResponse<Map<String, Integer>> batchDeleteAccounts(@PathVariable Long pubId, @RequestBody Map<String, List<Long>> body, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        List<Long> ids = body.get("personDbIds");
        if (ids == null || ids.isEmpty()) return ApiResponse.success(Map.of("deleted", 0));
        int count = 0;
        for (Long personDbId : ids) {
            try {
                accountDerivationService.deleteAccount(pubId, personDbId);
                count++;
            } catch (Exception e) {
                log.warn("批量删除跳过 personDbId={}: {}", personDbId, e.getMessage());
            }
        }
        return ApiResponse.success("已删除 " + count + " 个账号", Map.of("deleted", count));
    }

    @DeleteMapping("/orphans")
    public ApiResponse<Map<String, Integer>> cleanupOrphans(@PathVariable Long pubId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        int count = accountDerivationService.cleanupOrphanedAccounts(pubId);
        return ApiResponse.success("已清理 " + count + " 个空悬账号", Map.of("cleaned", count));
    }
}
