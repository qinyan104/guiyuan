package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.AccountDerivationService;
import com.genealogy.server.service.PublicationAuthorizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/publications/{pubId}/accounts")
@Tag(name = "族谱账号", description = "族谱关联账号管理")
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

    @Operation(summary = "派生账号", description = "为族谱中的人物自动派生登录账号")
    @PostMapping("/derive")
    public ApiResponse<List<Map<String, Object>>> derive(@Parameter(description = "族谱ID") @PathVariable Long pubId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        List<Map<String, Object>> created = accountDerivationService.deriveAccounts(pubId);
        return ApiResponse.success("已派生 " + created.size() + " 个账号", created);
    }

    @Operation(summary = "获取账号列表", description = "获取族谱关联的所有账号")
    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(@Parameter(description = "族谱ID") @PathVariable Long pubId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        return ApiResponse.success(accountDerivationService.listAccounts(pubId));
    }

    @Operation(summary = "停用账号", description = "停用指定人物的登录账号")
    @PutMapping("/{personDbId}/disable")
    public ApiResponse<Void> disable(@Parameter(description = "族谱ID") @PathVariable Long pubId, @Parameter(description = "人物数据库ID") @PathVariable Long personDbId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        accountDerivationService.disableAccount(personDbId);
        return ApiResponse.success("账号已停用", null);
    }

    @Operation(summary = "启用账号", description = "启用指定人物的登录账号")
    @PutMapping("/{personDbId}/enable")
    public ApiResponse<Void> enable(@Parameter(description = "族谱ID") @PathVariable Long pubId, @Parameter(description = "人物数据库ID") @PathVariable Long personDbId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        accountDerivationService.enableAccount(personDbId);
        return ApiResponse.success("账号已启用", null);
    }

    @Operation(summary = "重置账号密码", description = "重置指定人物账号的密码")
    @PostMapping("/{personDbId}/reset-password")
    public ApiResponse<Map<String, String>> resetPassword(@Parameter(description = "族谱ID") @PathVariable Long pubId, @Parameter(description = "人物数据库ID") @PathVariable Long personDbId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        String newPassword = accountDerivationService.resetPassword(personDbId);
        return ApiResponse.success("密码已重置", Map.of("newPassword", newPassword));
    }

    @Operation(summary = "删除账号", description = "删除指定人物的登录账号")
    @DeleteMapping("/{personDbId}")
    public ApiResponse<Void> deleteAccount(@Parameter(description = "族谱ID") @PathVariable Long pubId, @Parameter(description = "人物数据库ID") @PathVariable Long personDbId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        accountDerivationService.deleteAccount(pubId, personDbId);
        return ApiResponse.success("账号记录已删除", null);
    }

    @Operation(summary = "批量删除账号", description = "批量删除族谱中的多个账号")
    @PostMapping("/batch-delete")
    public ApiResponse<Map<String, Integer>> batchDeleteAccounts(@Parameter(description = "族谱ID") @PathVariable Long pubId, @RequestBody Map<String, List<Long>> body, HttpServletRequest request) {
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

    @Operation(summary = "清理孤立账号", description = "清理族谱中没有关联人物的空悬账号")
    @DeleteMapping("/orphans")
    public ApiResponse<Map<String, Integer>> cleanupOrphans(@Parameter(description = "族谱ID") @PathVariable Long pubId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        int count = accountDerivationService.cleanupOrphanedAccounts(pubId);
        return ApiResponse.success("已清理 " + count + " 个空悬账号", Map.of("cleaned", count));
    }
}
