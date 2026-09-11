package com.genealogy.server.controller;

import com.genealogy.server.auth.CurrentUserResolver;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
@Tag(name = "人物档案", description = "人物公开档案")
public class PersonProfileController {

    private final ProfileService profileService;
    private final CurrentUserResolver currentUserResolver;

    public PersonProfileController(ProfileService profileService, CurrentUserResolver currentUserResolver) {
        this.profileService = profileService;
        this.currentUserResolver = currentUserResolver;
    }

    @Operation(summary = "获取我的档案", description = "获取当前用户的关联人物档案")
    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> getMyProfile(HttpServletRequest request) {
        Long userId = currentUserResolver.requireUserId(request);
        return ApiResponse.success(profileService.getMyProfile(userId));
    }

    @Operation(summary = "提交档案修改", description = "提交人物档案的修改申请，等待管理员审核")
    @PutMapping("/me")
    public ApiResponse<Void> submitChange(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        Long userId = currentUserResolver.requireUserId(request);
        if (body == null) {
            throw new BadRequestException("请求体不能为空");
        }
        Object rawChanges = body.get("changes");
        if (rawChanges != null && !(rawChanges instanceof Map<?, ?>)) {
            throw new BadRequestException("修改内容必须是对象");
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> changes = (Map<String, Object>) rawChanges;
        if (changes == null || changes.isEmpty()) {
            return ApiResponse.success("没有需要提交的修改", null);
        }
        profileService.submitProfileChange(userId, changes);
        return ApiResponse.success("修改已提交，等待管理员审核", null);
    }

    @Operation(summary = "修改我的姓名", description = "直接修改当前用户关联人物的姓名")
    @PutMapping("/me/name")
    public ApiResponse<Void> updateMyName(@RequestBody(required = false) Map<String, String> body, HttpServletRequest request) {
        Long userId = currentUserResolver.requireUserId(request);
        String name = body == null ? null : body.get("name");
        if (name == null || name.isBlank() || name.length() > 100) {
            throw new BadRequestException("姓名不能为空且长度不能超过 100 个字符");
        }
        profileService.updateMyName(userId, name);
        return ApiResponse.success("姓名已更新", null);
    }
}
