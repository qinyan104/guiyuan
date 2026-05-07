package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/publications/{id}/access")
public class PublicationAccessController {

    private final PublicationAuthorizationService authorizationService;
    private final PublicationAccessRepository accessRepository;
    private final UserRepository userRepository;

    public PublicationAccessController(PublicationAuthorizationService authorizationService,
                                       PublicationAccessRepository accessRepository,
                                       UserRepository userRepository) {
        this.authorizationService = authorizationService;
        this.accessRepository = accessRepository;
        this.userRepository = userRepository;
    }

    private UserSubject getSubject(HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        if (username == null) throw new ForbiddenException("未登录");
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ForbiddenException("未登录"));
        return new UserSubject(user.getId(), user.getRole(), user.getUsername());
    }

    @GetMapping
    public List<Map<String, Object>> listAccess(@PathVariable Long id, HttpServletRequest request) {
        authorizationService.require(getSubject(request), id, AccessPermission.MANAGE_ACCESS);
        return accessRepository.findByPublicationId(id).stream().map(access -> {
            User user = userRepository.findById(access.getUserId()).orElse(null);
            return Map.of(
                    "id", (Object) access.getId(),
                    "userId", access.getUserId(),
                    "role", access.getRole(),
                    "createdAt", access.getCreatedAt() != null ? access.getCreatedAt().toString() : "",
                    "username", user != null ? user.getUsername() : "未知",
                    "nickname", user != null && user.getNickname() != null ? user.getNickname() : (user != null ? user.getUsername() : "未知")
            );
        }).collect(Collectors.toList());
    }

    @PostMapping
    public Map<String, Object> addAccess(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        authorizationService.require(getSubject(request), id, AccessPermission.MANAGE_ACCESS);
        
        Long targetUserId = Long.valueOf(body.get("userId").toString());
        String role = body.get("role").toString();
        
        if ("OWNER".equals(role)) {
            throw new ForbiddenException("不能添加OWNER角色");
        }
        
        if (accessRepository.findByPublicationIdAndUserId(id, targetUserId).isPresent()) {
            throw new ForbiddenException("该用户已在协作者列表中");
        }

        PublicationAccess access = new PublicationAccess();
        access.setPublicationId(id);
        access.setUserId(targetUserId);
        access.setRole(role);
        access.setCreatedBy(getSubject(request).getUserId());
        access = accessRepository.save(access);

        return Map.of("success", true, "id", access.getId());
    }

    @PutMapping("/{userId}")
    public Map<String, Object> updateAccess(@PathVariable Long id, @PathVariable Long userId, @RequestBody Map<String, String> body, HttpServletRequest request) {
        authorizationService.require(getSubject(request), id, AccessPermission.MANAGE_ACCESS);
        
        String newRole = body.get("role");
        if ("OWNER".equals(newRole)) {
            throw new ForbiddenException("不能更改为OWNER角色");
        }

        PublicationAccess access = accessRepository.findByPublicationIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("找不到该用户的权限记录"));

        if ("OWNER".equals(access.getRole())) {
            throw new ForbiddenException("不能修改OWNER的权限");
        }

        access.setRole(newRole);
        accessRepository.save(access);

        return Map.of("success", true);
    }

    @DeleteMapping("/{userId}")
    public Map<String, Object> removeAccess(@PathVariable Long id, @PathVariable Long userId, HttpServletRequest request) {
        authorizationService.require(getSubject(request), id, AccessPermission.MANAGE_ACCESS);
        
        PublicationAccess access = accessRepository.findByPublicationIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("找不到该用户的权限记录"));

        if ("OWNER".equals(access.getRole())) {
            throw new ForbiddenException("不能移除OWNER");
        }

        accessRepository.delete(access);

        return Map.of("success", true);
    }
}
