package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/search")
    public ApiResponse<List<Map<String, Object>>> searchUsers(@RequestParam String q) {
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
