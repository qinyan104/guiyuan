package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@Tag(name = "文件", description = "文件上传管理")
public class FileController {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"
    );

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"
    );

    private final String uploadDir;
    private final long maxFileSizeBytes;

    public FileController(@Value("${app.upload.dir:uploads}") String uploadDir,
                          @Value("${app.upload.max-file-size-bytes:26214400}") long maxFileSizeBytes) {
        this.uploadDir = new File(uploadDir).getAbsolutePath() + File.separator;
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    @Operation(summary = "上传文件", description = "上传图片或PDF文件")
    @PostMapping("/upload")
    public ApiResponse<String> uploadFile(@Parameter(description = "要上传的文件") @RequestParam("file") MultipartFile file,
                                          HttpServletRequest request) {
        if (file.isEmpty()) {
            return ApiResponse.error("文件不能为空");
        }

        if (file.getSize() > maxFileSizeBytes) {
            return ApiResponse.error("文件大小不能超过 " + formatMegabytes(maxFileSizeBytes));
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
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, path, StandardCopyOption.REPLACE_EXISTING);
            }

            String baseUrl = request.getScheme() + "://" + request.getServerName()
                    + ":" + request.getServerPort();
            String fileUrl = baseUrl + "/uploads/" + newFilename;
            return ApiResponse.success("上传成功", fileUrl);

        } catch (IOException e) {
            return ApiResponse.error("文件上传失败，请稍后重试");
        }
    }
    private String formatMegabytes(long bytes) {
        long megabytes = Math.max(1, bytes / (1024 * 1024));
        return megabytes + "MB";
    }
}
