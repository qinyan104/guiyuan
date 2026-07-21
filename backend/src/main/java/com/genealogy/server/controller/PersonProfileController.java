package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
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
    private final UserRepository userRepository;

    public PersonProfileController(ProfileService profileService, UserRepository userRepository) {
        this.profileService = profileService;
        this.userRepository = userRepository;
    }

    private Long resolveUserId(HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        if (username == null) throw new ForbiddenException("未登录");
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ForbiddenException("未登录"));
        return user.getId();
    }

    @Operation(summary = "获取我的档案", description = "获取当前用户的关联人物档案")
    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> getMyProfile(HttpServletRequest request) {
        Long userId = resolveUserId(request);
        return ApiResponse.success(profileService.getMyProfile(userId));
    }

    @Operation(summary = "提交档案修改", description = "提交人物档案的修改申请，等待管理员审核")
    @PutMapping("/me")
    public ApiResponse<Void> submitChange(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = resolveUserId(request);
        @SuppressWarnings("unchecked")
        Map<String, Object> changes = (Map<String, Object>) body.get("changes");
        if (changes == null || changes.isEmpty()) {
            return ApiResponse.success("没有需要提交的修改", null);
        }
        profileService.submitProfileChange(userId, changes);
        return ApiResponse.success("修改已提交，等待管理员审核", null);
    }

    @Operation(summary = "修改我的姓名", description = "直接修改当前用户关联人物的姓名")
    @PutMapping("/me/name")
    public ApiResponse<Void> updateMyName(@RequestBody Map<String, String> body, HttpServletRequest request) {
        Long userId = resolveUserId(request);
        profileService.updateMyName(userId, body.get("name"));
        return ApiResponse.success("姓名已更新", null);
    }
}
