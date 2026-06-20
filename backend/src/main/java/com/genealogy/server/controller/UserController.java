package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@Tag(name = "用户", description = "用户查询")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Operation(summary = "搜索用户", description = "根据用户名或昵称搜索用户")
    @GetMapping("/search")
    public ApiResponse<List<Map<String, Object>>> searchUsers(@Parameter(description = "搜索关键词") @RequestParam String q) {
        if (q == null || q.trim().isEmpty()) {
            return ApiResponse.success(List.of());
        }
        List<Map<String, Object>> users = userRepository.findByUsernameContainingIgnoreCaseOrNicknameContainingIgnoreCase(q, q)
                .stream()
                .map(user -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", user.getId());
                    m.put("username", user.getUsername());
                    m.put("nickname", user.getNickname() != null ? user.getNickname() : user.getUsername());
                    return m;
                })
                .toList();
        return ApiResponse.success(users);
    }
}
