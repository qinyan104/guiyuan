package com.genealogy.server.service;

import com.genealogy.server.dto.LoginRequest;
import com.genealogy.server.dto.RegisterRequest;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User register(RegisterRequest request) {
        long userCount = userRepository.count();
        if (userCount > 0) {
            throw new BadRequestException("注册已关闭，请联系管理员创建账号");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("用户名已存在");
        }
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getNickname() != null ? request.getNickname() : request.getUsername());
        user.setRole("SUPER_ADMIN");
        return userRepository.save(user);
    }

    /**
     * Authenticate user and return the User entity.
     * Supports legacy SHA-256 password auto-migration to BCrypt.
     */
    public User loginAndReturnUser(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new NotFoundException("用户不存在"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            // Legacy SHA-256 fallback + auto-migration
            if (sha256Hex(request.getPassword()).equals(user.getPassword())) {
                user.setPassword(passwordEncoder.encode(request.getPassword()));
                userRepository.save(user);
            } else {
                throw new BadRequestException("密码错误");
            }
        }
        return user;
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public boolean isSuperAdmin(String username) {
        return userRepository.findByUsername(username)
                .map(u -> "SUPER_ADMIN".equals(u.getRole()))
                .orElse(false);
    }

    public boolean isAdmin(String username) {
        return userRepository.findByUsername(username)
                .map(u -> "SUPER_ADMIN".equals(u.getRole()) || "ADMIN".equals(u.getRole()))
                .orElse(false);
    }

    public User createUser(String username, String password, String nickname, String role) {
        if (userRepository.existsByUsername(username)) {
            throw new BadRequestException("用户名已存在");
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname(nickname != null ? nickname : username);
        user.setRole(("ADMIN".equals(role)) ? "ADMIN" : "USER");
        return userRepository.save(user);
    }

    public User createUser(String username, String password, String nickname) {
        return createUser(username, password, nickname, "USER");
    }

    public void changeUserRole(Long userId, String newRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("用户不存在"));
        if ("SUPER_ADMIN".equals(user.getRole())) {
            throw new ForbiddenException("不能修改超级管理员的角色");
        }
        if (!"ADMIN".equals(newRole) && !"USER".equals(newRole)) {
            throw new BadRequestException("无效的角色");
        }
        user.setRole(newRole);
        userRepository.save(user);
    }

    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("用户不存在"));
        if ("SUPER_ADMIN".equals(user.getRole())) {
            throw new ForbiddenException("不能删除超级管理员账号");
        }
        userRepository.deleteById(userId);
    }

    public void resetPassword(Long userId, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("用户不存在"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void changePassword(String username, String oldPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("用户不存在"));
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new BadRequestException("当前密码不正确");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void changeNickname(String username, String nickname) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("用户不存在"));
        user.setNickname(nickname);
        userRepository.save(user);
    }

    public List<User> listAllUsers() {
        return userRepository.findAll();
    }

    public void migrateExistingUsers() {
        List<User> all = userRepository.findAll();
        boolean changed = false;
        boolean first = true;
        for (User u : all) {
            if (u.getRole() == null || u.getRole().isEmpty()) {
                u.setRole(first ? "SUPER_ADMIN" : "ADMIN");
                first = false;
                changed = true;
            }
            if ("ADMIN".equals(u.getRole()) && first) {
                u.setRole("SUPER_ADMIN");
                first = false;
                changed = true;
            }
            if ("SUPER_ADMIN".equals(u.getRole())) {
                first = false;
            }
        }
        if (changed) {
            userRepository.saveAll(all);
        }
    }

    private String sha256Hex(String input) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) sb.append('0');
                sb.append(hex);
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 failed", e);
        }
    }
}
