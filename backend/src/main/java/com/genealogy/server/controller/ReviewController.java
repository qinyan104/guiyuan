package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/publications/{pubId}/reviews")
@Tag(name = "审核", description = "族谱变更审核")
public class ReviewController {

    private final ReviewService reviewService;
    private final PublicationAuthorizationService authorizationService;
    private final UserRepository userRepository;

    public ReviewController(ReviewService reviewService,
                            PublicationAuthorizationService authorizationService,
                            UserRepository userRepository) {
        this.reviewService = reviewService;
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

    @Operation(summary = "获取审核列表", description = "获取族谱的审核记录列表")
    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(@Parameter(description = "族谱ID") @PathVariable Long pubId,
                                                        @Parameter(description = "审核状态筛选") @RequestParam(required = false) String status,
                                                        HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        return ApiResponse.success(reviewService.listReviews(pubId, status));
    }

    @Operation(summary = "获取审核详情", description = "获取指定审核记录的详细信息")
    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> detail(@Parameter(description = "族谱ID") @PathVariable Long pubId, @Parameter(description = "审核记录ID") @PathVariable Long id,
                                                    HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        return ApiResponse.success(reviewService.getReviewDetail(id));
    }

    @Operation(summary = "通过审核", description = "批准指定的审核记录")
    @PostMapping("/{id}/approve")
    public ApiResponse<Void> approve(@Parameter(description = "族谱ID") @PathVariable Long pubId, @Parameter(description = "审核记录ID") @PathVariable Long id,
                                      HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        reviewService.approve(id, subject.getUserId());
        return ApiResponse.success("已通过", null);
    }

    @Operation(summary = "拒绝审核", description = "拒绝指定的审核记录并填写原因")
    @PostMapping("/{id}/reject")
    public ApiResponse<Void> reject(@Parameter(description = "族谱ID") @PathVariable Long pubId, @Parameter(description = "审核记录ID") @PathVariable Long id,
                                     @RequestBody Map<String, String> body,
                                     HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        String reason = body.get("reason");
        if (reason == null || reason.isBlank()) {
            return ApiResponse.error(400, "拒绝原因不能为空");
        }
        reviewService.reject(id, subject.getUserId(), reason);
        return ApiResponse.success("已拒绝", null);
    }

    @Operation(summary = "批量审核操作", description = "批量通过或拒绝审核记录")
    @PostMapping("/batch")
    public ApiResponse<Void> batch(@Parameter(description = "族谱ID") @PathVariable Long pubId,
                                    @RequestBody Map<String, Object> body,
                                    HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);

        @SuppressWarnings("unchecked")
        List<Number> idNumbers = (List<Number>) body.get("ids");
        if (idNumbers == null || idNumbers.isEmpty()) {
            return ApiResponse.error(400, "请选择要操作的记录");
        }
        List<Long> ids = idNumbers.stream().map(Number::longValue).toList();
        String action = (String) body.get("action");
        String reason = (String) body.get("reason");

        reviewService.batchAction(ids, action, subject.getUserId(), reason);
        return ApiResponse.success("批量操作完成", null);
    }
}
