package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.ReviewService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/publications/{pubId}/reviews")
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

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(@PathVariable Long pubId,
                                                        @RequestParam(required = false) String status,
                                                        HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        return ApiResponse.success(reviewService.listReviews(pubId, status));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> detail(@PathVariable Long pubId, @PathVariable Long id,
                                                    HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        return ApiResponse.success(reviewService.getReviewDetail(id));
    }

    @PostMapping("/{id}/approve")
    public ApiResponse<Void> approve(@PathVariable Long pubId, @PathVariable Long id,
                                      HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        requireOwnerOrSuperAdmin(subject, pubId);
        reviewService.approve(id, subject.getUserId());
        return ApiResponse.success("已通过", null);
    }

    @PostMapping("/{id}/reject")
    public ApiResponse<Void> reject(@PathVariable Long pubId, @PathVariable Long id,
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

    @PostMapping("/batch")
    public ApiResponse<Void> batch(@PathVariable Long pubId,
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
