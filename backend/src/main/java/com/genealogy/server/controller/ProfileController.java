package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.service.UserService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/user")
public class ProfileController {

    private final UserService userService;

    @Value("${app.upload.dir:uploads/avatars}")
    private String avatarUploadDir;

    public ProfileController(UserService userService) {
        this.userService = userService;
    }

    @PutMapping("/password")
    public ApiResponse<Void> changePassword(@RequestBody Map<String, String> body, Authentication authentication) {
        String username = authentication.getName();
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");

        if (oldPassword == null || oldPassword.isBlank()) {
            return ApiResponse.error(400, "请输入当前密码");
        }
        if (newPassword == null || newPassword.length() < 8) {
            return ApiResponse.error(400, "新密码至少8个字符");
        }
        if (!newPassword.matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$")) {
            return ApiResponse.error(400, "新密码须包含大小写字母和数字");
        }

        userService.changePassword(username, oldPassword, newPassword);
        return ApiResponse.success("密码修改成功", null);
    }

    @PutMapping("/nickname")
    public ApiResponse<Void> changeNickname(@RequestBody Map<String, String> body, Authentication authentication) {
        String username = authentication.getName();
        String nickname = body.get("nickname");

        if (nickname == null || nickname.isBlank()) {
            return ApiResponse.error(400, "昵称不能为空");
        }

        userService.changeNickname(username, nickname.trim());
        return ApiResponse.success("昵称修改成功", null);
    }

    @PostMapping("/avatar")
    public ApiResponse<String> uploadAvatar(@RequestParam("file") MultipartFile file, Authentication authentication) throws IOException {
        String username = authentication.getName();

        if (file.isEmpty()) {
            return ApiResponse.error(400, "文件不能为空");
        }

        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ApiResponse.error(400, "仅支持图片文件");
        }

        // Ensure upload directory exists
        Path uploadPath = Path.of(avatarUploadDir);
        Files.createDirectories(uploadPath);

        // Save file with unique name
        String extension = Optional.ofNullable(file.getOriginalFilename())
                .map(f -> f.contains(".") ? f.substring(f.lastIndexOf(".")) : ".jpg")
                .orElse(".jpg");
        String filename = username + "_" + System.currentTimeMillis() + extension;
        Path targetPath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        String avatarUrl = "/api/photos/avatars/" + filename;

        return ApiResponse.success("头像上传成功", avatarUrl);
    }
}
