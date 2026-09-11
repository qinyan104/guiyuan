package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.CurrentUserResolver;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.exception.BadRequestException;
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
    private final CurrentUserResolver currentUserResolver;

    public ReviewController(ReviewService reviewService,
                            PublicationAuthorizationService authorizationService,
                            CurrentUserResolver currentUserResolver) {
        this.reviewService = reviewService;
        this.authorizationService = authorizationService;
        this.currentUserResolver = currentUserResolver;
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
        UserSubject subject = currentUserResolver.requireSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        return ApiResponse.success(reviewService.listReviews(pubId, status));
    }

    @Operation(summary = "获取审核详情", description = "获取指定审核记录的详细信息")
    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> detail(@Parameter(description = "族谱ID") @PathVariable Long pubId, @Parameter(description = "审核记录ID") @PathVariable Long id,
                                                    HttpServletRequest request) {
        UserSubject subject = currentUserResolver.requireSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        return ApiResponse.success(reviewService.getReviewDetail(id));
    }

    @Operation(summary = "通过审核", description = "批准指定的审核记录")
    @PostMapping("/{id}/approve")
    public ApiResponse<Void> approve(@Parameter(description = "族谱ID") @PathVariable Long pubId, @Parameter(description = "审核记录ID") @PathVariable Long id,
                                      HttpServletRequest request) {
        UserSubject subject = currentUserResolver.requireSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        reviewService.approve(id, subject.getUserId());
        return ApiResponse.success("已通过", null);
    }

    @Operation(summary = "拒绝审核", description = "拒绝指定的审核记录并填写原因")
    @PostMapping("/{id}/reject")
    public ApiResponse<Void> reject(@Parameter(description = "族谱ID") @PathVariable Long pubId, @Parameter(description = "审核记录ID") @PathVariable Long id,
                                     @RequestBody(required = false) Map<String, String> body,
                                     HttpServletRequest request) {
        UserSubject subject = currentUserResolver.requireSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        String reason = body == null ? null : body.get("reason");
        if (reason == null || reason.isBlank()) {
            return ApiResponse.error(400, "拒绝原因不能为空");
        }
        reviewService.reject(id, subject.getUserId(), reason);
        return ApiResponse.success("已拒绝", null);
    }

    @Operation(summary = "批量审核操作", description = "批量通过或拒绝审核记录")
    @PostMapping("/batch")
    public ApiResponse<Void> batch(@Parameter(description = "族谱ID") @PathVariable Long pubId,
                                    @RequestBody(required = false) Map<String, Object> body,
                                    HttpServletRequest request) {
        UserSubject subject = currentUserResolver.requireSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);

        if (body == null) {
            throw new BadRequestException("请求体不能为空");
        }
        Object rawIds = body.get("ids");
        if (!(rawIds instanceof List<?> idValues) || idValues.isEmpty()
                || idValues.stream().anyMatch(value -> !(value instanceof Number) || ((Number) value).longValue() <= 0)) {
            return ApiResponse.error(400, "请选择有效的审核记录");
        }
        List<Long> ids = idValues.stream().map(value -> ((Number) value).longValue()).toList();
        Object rawAction = body.get("action");
        if (!(rawAction instanceof String action)
                || !(action.equalsIgnoreCase("approve") || action.equalsIgnoreCase("reject"))) {
            return ApiResponse.error(400, "审核操作必须是 approve 或 reject");
        }
        action = action.toLowerCase(java.util.Locale.ROOT);
        Object rawReason = body.get("reason");
        if (rawReason != null && !(rawReason instanceof String)) {
            throw new BadRequestException("拒绝原因必须是字符串");
        }
        String reason = (String) rawReason;

        reviewService.batchAction(ids, action, subject.getUserId(), reason);
        return ApiResponse.success("批量操作完成", null);
    }
}
