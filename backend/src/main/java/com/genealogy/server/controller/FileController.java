package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class FileController {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf"
    );

    private final String uploadDir = new File("uploads").getAbsolutePath() + File.separator;

    @PostMapping("/upload")
    public ApiResponse<String> uploadFile(@RequestParam("file") MultipartFile file,
                                          HttpServletRequest request) {
        if (file.isEmpty()) {
            return ApiResponse.error("文件不能为空");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        }

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            return ApiResponse.error("不支持的文件类型，仅允许: " + String.join(", ", ALLOWED_EXTENSIONS));
        }

        try {
            File dir = new File(uploadDir);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String newFilename = UUID.randomUUID().toString() + extension;
            Path path = Paths.get(uploadDir + newFilename);
            Files.write(path, file.getBytes());

            String baseUrl = request.getScheme() + "://" + request.getServerName()
                    + ":" + request.getServerPort();
            String fileUrl = baseUrl + "/uploads/" + newFilename;
            return ApiResponse.success("上传成功", fileUrl);

        } catch (IOException e) {
            return ApiResponse.error("上传失败: " + e.getMessage());
        }
    }
}
