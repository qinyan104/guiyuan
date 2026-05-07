// backend/src/main/java/com/genealogy/server/controller/UserController.java
package com.genealogy.server.controller;

import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/search")
    public List<Map<String, Object>> searchUsers(@RequestParam String q) {
        if (q == null || q.trim().isEmpty()) {
            return List.of();
        }
        return userRepository.findByUsernameContainingIgnoreCaseOrNicknameContainingIgnoreCase(q, q)
                .stream()
                .map(user -> Map.of(
                        "id", (Object) user.getId(),
                        "username", user.getUsername(),
                        "nickname", user.getNickname() != null ? user.getNickname() : user.getUsername()
                ))
                .collect(Collectors.toList());
    }
}
