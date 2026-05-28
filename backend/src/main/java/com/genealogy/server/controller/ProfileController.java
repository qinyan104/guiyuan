package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.PersonAccount;
import com.genealogy.server.model.Photo;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.PersonAccountRepository;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PhotoRepository;
import com.genealogy.server.repository.UserRepository;
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
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/user")
public class ProfileController {

    private final UserService userService;
    private final PersonAccountRepository personAccountRepository;
    private final PersonRepository personRepository;
    private final PhotoRepository photoRepository;
    private final UserRepository userRepository;

    @Value("${app.upload.dir:uploads/avatars}")
    private String avatarUploadDir;

    public ProfileController(UserService userService,
                             PersonAccountRepository personAccountRepository,
                             PersonRepository personRepository,
                             PhotoRepository photoRepository,
                             UserRepository userRepository) {
        this.userService = userService;
        this.personAccountRepository = personAccountRepository;
        this.personRepository = personRepository;
        this.photoRepository = photoRepository;
        this.userRepository = userRepository;
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
        Path uploadPath = Path.of(avatarUploadDir).normalize();
        Files.createDirectories(uploadPath);

        // Use UUID filename to avoid path traversal and username exposure
        String extension = Optional.ofNullable(file.getOriginalFilename())
                .map(f -> f.contains(".") ? f.substring(f.lastIndexOf(".")) : ".jpg")
                .orElse(".jpg");
        // Only allow common image extensions
        if (!Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp").contains(extension.toLowerCase())) {
            extension = ".jpg";
        }
        String filename = UUID.randomUUID() + extension;
        Path targetPath = uploadPath.resolve(filename).normalize();
        // Ensure target is still within the upload directory
        if (!targetPath.startsWith(uploadPath)) {
            return ApiResponse.error(400, "无效的文件名");
        }
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        byte[] data = Files.readAllBytes(targetPath);

        // Create Photo record and associate with the user's person
        User user = userRepository.findByUsername(username).orElse(null);
        Optional<PersonAccount> pa = user != null
            ? personAccountRepository.findByUserId(user.getId())
            : Optional.empty();
        if (pa.isPresent()) {
            Person person = personRepository.findById(pa.get().getPersonDbId()).orElse(null);
            if (person != null) {
                // Delete old photo if exists
                if (person.getPhotoId() != null) {
                    photoRepository.deleteById(person.getPhotoId());
                }
                // Create new photo
                Photo photo = new Photo();
                photo.setPersonDbId(person.getId());
                photo.setMimeType(contentType);
                photo.setData(data);
                photo = photoRepository.save(photo);
                // Update person
                person.setPhotoId(photo.getId());
                personRepository.save(person);
            }
        }

        String photoId = pa.isPresent()
            ? personRepository.findById(pa.get().getPersonDbId()).map(p -> String.valueOf(p.getPhotoId())).orElse(null)
            : null;
        String avatarUrl = photoId != null ? "/api/photos/" + photoId : "/api/photos/avatars/" + filename;

        return ApiResponse.success("头像上传成功", avatarUrl);
    }
}
