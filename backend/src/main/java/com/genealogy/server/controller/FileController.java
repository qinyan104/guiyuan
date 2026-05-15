package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
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
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"
    );

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"
    );

    private final String uploadDir;

    public FileController(@Value("${app.upload.dir:uploads}") String uploadDir) {
        this.uploadDir = new File(uploadDir).getAbsolutePath() + File.separator;
    }

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

        String mimeType = file.getContentType();
        if (mimeType == null || !ALLOWED_MIME_TYPES.contains(mimeType)) {
            return ApiResponse.error("不支持的文件格式，仅允许图片和 PDF 文件");
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
            return ApiResponse.error("文件上传失败，请稍后重试");
        }
    }
}
