package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.CurrentUserResolver;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.UploadedFile;
import com.genealogy.server.repository.UploadedFileRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.util.UploadContentValidator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Positive;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Set;
import java.util.UUID;

@RestController
@Validated
@RequestMapping("/api")
@Tag(name = "文件", description = "文件上传管理")
public class FileController {

    private static final Logger log = LoggerFactory.getLogger(FileController.class);
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"
    );

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"
    );

    private final Path uploadRoot;
    private final long maxFileSizeBytes;
    private final String publicBaseUrl;
    private final UploadedFileRepository uploadedFileRepository;
    private final CurrentUserResolver currentUserResolver;
    private final PublicationAuthorizationService authorizationService;

    public FileController(@Value("${app.upload.dir:uploads}") String uploadDir,
                          @Value("${app.upload.max-file-size-bytes:26214400}") long maxFileSizeBytes,
                          @Value("${app.public-base-url:}") String publicBaseUrl,
                          UploadedFileRepository uploadedFileRepository,
                          CurrentUserResolver currentUserResolver,
                          PublicationAuthorizationService authorizationService) {
        this.uploadRoot = Path.of(uploadDir).toAbsolutePath().normalize();
        this.maxFileSizeBytes = maxFileSizeBytes;
        this.publicBaseUrl = publicBaseUrl == null ? "" : publicBaseUrl.replaceAll("/+$", "");
        this.uploadedFileRepository = uploadedFileRepository;
        this.currentUserResolver = currentUserResolver;
        this.authorizationService = authorizationService;
    }

    @Operation(summary = "上传文件", description = "上传图片或PDF文件")
    @PostMapping("/upload")
    public ApiResponse<String> uploadFile(@Parameter(description = "要上传的文件") @RequestParam("file") MultipartFile file,
                                          @RequestParam(value = "publicationId", required = false) @Positive(message = "族谱 ID 必须为正数") Long publicationId,
                                          HttpServletRequest request) {
        UserSubject subject = currentUserResolver.requireSubject(request);
        if (publicationId != null) {
            authorizationService.require(subject, publicationId, AccessPermission.EDIT);
        }

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
            byte[] content = file.getBytes();
            if (!UploadContentValidator.hasExpectedSignature(content, mimeType)) {
                return ApiResponse.error("文件内容与声明的格式不一致");
            }
            if (mimeType.startsWith("image/") && !UploadContentValidator.hasValidImageDimensions(content, mimeType)) {
                return ApiResponse.error("图片内容无效或尺寸超出限制");
            }
        } catch (IOException e) {
            return ApiResponse.error("无法读取文件内容");
        }

        Path path = null;
        try {
            Files.createDirectories(uploadRoot);
            String newFilename = UUID.randomUUID() + extension;
            Path candidatePath = uploadRoot.resolve(newFilename).normalize();
            if (!candidatePath.startsWith(uploadRoot)) {
                throw new IOException("上传目标路径无效");
            }
            OutputStream outputStream = Files.newOutputStream(
                    candidatePath, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
            path = candidatePath;
            try (outputStream; InputStream inputStream = file.getInputStream()) {
                inputStream.transferTo(outputStream);
            }

            UploadedFile uploadedFile = new UploadedFile();
            uploadedFile.setStorageKey(newFilename);
            uploadedFile.setOriginalName(originalFilename);
            uploadedFile.setMimeType(mimeType);
            uploadedFile.setSize(file.getSize());
            uploadedFile.setOwnerUserId(subject.getUserId());
            uploadedFile.setPublicationId(publicationId);
            uploadedFile = uploadedFileRepository.save(uploadedFile);
            String fileUrl = (publicBaseUrl.isBlank() ? "" : publicBaseUrl) + "/api/files/" + uploadedFile.getId();
            return ApiResponse.success("上传成功", fileUrl);
        } catch (IOException e) {
            deletePartialUpload(path, e);
            return ApiResponse.error("文件上传失败，请稍后重试");
        } catch (RuntimeException e) {
            deletePartialUpload(path, e);
            throw e;
        }
    }
    @GetMapping("/files/{id}")
    public ResponseEntity<byte[]> download(@PathVariable @Positive(message = "文件 ID 必须为正数") Long id, HttpServletRequest request) throws IOException {
        UserSubject subject = currentUserResolver.requireSubject(request);
        UploadedFile uploadedFile = uploadedFileRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("文件不存在"));
        if (uploadedFile.getPublicationId() != null) {
            authorizationService.require(subject, uploadedFile.getPublicationId(), AccessPermission.READ_FULL);
        } else if (!uploadedFile.getOwnerUserId().equals(subject.getUserId())) {
            throw new ForbiddenException("无权访问该文件");
        }
        Path path = uploadRoot.resolve(uploadedFile.getStorageKey()).normalize();
        if (!path.startsWith(uploadRoot) || !Files.isRegularFile(path)) {
            throw new NotFoundException("文件不存在");
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, uploadedFile.getMimeType())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(Files.readAllBytes(path));
    }

    private void deletePartialUpload(Path path, Exception originalException) {
        if (path == null) {
            return;
        }
        Path normalizedPath = path.toAbsolutePath().normalize();
        if (!uploadRoot.equals(normalizedPath.getParent())) {
            SecurityException cleanupException = new SecurityException("拒绝清理上传根目录外的文件");
            originalException.addSuppressed(cleanupException);
            log.warn("拒绝清理上传根目录外的路径 {}", normalizedPath);
            return;
        }
        try {
            Files.deleteIfExists(normalizedPath);
        } catch (IOException | SecurityException cleanupException) {
            originalException.addSuppressed(cleanupException);
            log.warn("清理失败的上传文件 {} 时出错", normalizedPath.getFileName(), cleanupException);
        }
    }

    private String formatMegabytes(long bytes) {
        long megabytes = Math.max(1, bytes / (1024 * 1024));
        return megabytes + "MB";
    }
}
