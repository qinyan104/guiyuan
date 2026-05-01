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

import org.springframework.scheduling.annotation.Scheduled;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class UserService {

    private static final Duration TOKEN_TTL = Duration.ofHours(24);
    private record TokenEntry(String username, Instant createdAt) {}

    private final ConcurrentMap<String, TokenEntry> tokenStore = new ConcurrentHashMap<>();
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
        user.setRole("SUPER_ADMIN"); // 第一个用户自动成为超级管理员

        return userRepository.save(user);
    }

    public String login(LoginRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());

        if (userOpt.isEmpty()) {
            throw new NotFoundException("用户不存在");
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            if (!sha256Hex(request.getPassword()).equals(user.getPassword())) {
                throw new BadRequestException("密码错误");
            }
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            userRepository.save(user);
        }

        String token = UUID.randomUUID().toString().replace("-", "");
        tokenStore.put(token, new TokenEntry(user.getUsername(), Instant.now()));
        return token;
    }

    public String validateToken(String token) {
        TokenEntry entry = tokenStore.get(token);
        if (entry == null) return null;
        return entry.username();
    }

    public void removeToken(String token) {
        tokenStore.remove(token);
    }

    @Scheduled(fixedRate = 600_000) // 每 10 分钟清理一次
    public void evictExpiredTokens() {
        Instant cutoff = Instant.now().minus(TOKEN_TTL);
        tokenStore.entrySet().removeIf(e -> e.getValue().createdAt().isBefore(cutoff));
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
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

    public boolean isAtLeastAdmin(String username) {
        return isAdmin(username);
    }

    public User createUser(String username, String password, String nickname, String role) {
        if (userRepository.existsByUsername(username)) {
            throw new BadRequestException("用户名已存在");
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname(nickname != null ? nickname : username);
        // 只允许创建 ADMIN 和 USER，不能通过此接口创建 SUPER_ADMIN
        user.setRole(("ADMIN".equals(role)) ? "ADMIN" : "USER");
        return userRepository.save(user);
    }

    public User createUser(String username, String password, String nickname) {
        return createUser(username, password, nickname, "USER");
    }

    public void changeUserRole(Long userId, String newRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("用户不存在"));
        // 不能修改 SUPER_ADMIN 的角色
        if ("SUPER_ADMIN".equals(user.getRole())) {
            throw new ForbiddenException("不能修改超级管理员的角色");
        }
        // 只允许设置为 ADMIN 或 USER
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

    /**
     * 启动时迁移：给没有 role 的旧用户设为 SUPER_ADMIN（第一个）或 ADMIN
     */
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
                // 如果第一个用户已经是 ADMIN，升级为 SUPER_ADMIN
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
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) sb.append('0');
                sb.append(hex);
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 计算失败", e);
        }
    }
}
