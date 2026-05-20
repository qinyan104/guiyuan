package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.ProfileService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
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

    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> getMyProfile(HttpServletRequest request) {
        Long userId = resolveUserId(request);
        return ApiResponse.success(profileService.getMyProfile(userId));
    }

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
}
