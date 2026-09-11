package com.genealogy.server.service;

import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.model.Photo;
import com.genealogy.server.repository.PhotoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Base64;

@Service
public class PhotoService {

    private static final Logger log = LoggerFactory.getLogger(PhotoService.class);

    private final PhotoRepository photoRepository;

    public PhotoService(PhotoRepository photoRepository) {
        this.photoRepository = photoRepository;
    }

    /**
     * Handle avatar URL for a person: supports Base64 data URLs, /api/photos/ references,
     * and legacy /uploads/ paths. Returns the photo DB ID, or null if no avatar or on failure.
     */
    public Long handlePersonAvatar(Long personDbId, String avatarUrl, boolean cloneReferencedPhotos) {
        if (avatarUrl == null) {
            return null;
        }
        if (avatarUrl.startsWith("data:image/")) {
            return handleBase64Avatar(personDbId, avatarUrl);
        } else if (avatarUrl.startsWith("/api/photos/")) {
            return handleApiPhotoUrl(personDbId, avatarUrl, cloneReferencedPhotos);
        } else if (isLegacyUploadAvatarUrl(avatarUrl)) {
            Photo importedPhoto = importLegacyUploadPhotoForPerson(avatarUrl, personDbId);
            return importedPhoto != null ? importedPhoto.getId() : null;
        }
        return null;
    }

    public Photo clonePhotoForPerson(Long sourcePhotoId, Long personDbId) {
        return photoRepository.findById(sourcePhotoId)
                .map(sourcePhoto -> {
                    Photo clonedPhoto = new Photo();
                    clonedPhoto.setPersonDbId(personDbId);
                    clonedPhoto.setMimeType(sourcePhoto.getMimeType());
                    clonedPhoto.setData(Arrays.copyOf(sourcePhoto.getData(), sourcePhoto.getData().length));
                    return photoRepository.save(clonedPhoto);
                })
                .orElseGet(() -> {
                    log.warn("Source photo {} was not found for person {}", sourcePhotoId, personDbId);
                    return null;
                });
    }

    private Long handleBase64Avatar(Long personDbId, String base64Url) {
        int commaIndex = base64Url.indexOf(",");
        if (commaIndex < 0) {
            throw new BadRequestException("头像 Base64 数据缺少内容分隔符");
        }

        String header = base64Url.substring(0, commaIndex);
        int mimeStart = header.indexOf(":");
        int mimeEnd = header.indexOf(";");
        if (mimeStart < 0 || mimeEnd <= mimeStart) {
            throw new BadRequestException("头像 Base64 数据缺少有效的 MIME 类型");
        }
        String mimeType = header.substring(mimeStart + 1, mimeEnd);
        String base64Data = base64Url.substring(commaIndex + 1).replaceAll("\\s", "");

        byte[] dataBytes;
        try {
            dataBytes = Base64.getMimeDecoder().decode(base64Data);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("头像 Base64 数据无法解码", e);
        }

        log.info("正在导入 Base64 头像 (personDbId: {}, mimeType: {}, size: {} bytes)", personDbId, mimeType, dataBytes.length);

        Photo photo = new Photo();
        photo.setMimeType(mimeType);
        photo.setData(dataBytes);
        photo.setPersonDbId(personDbId);
        photo = photoRepository.save(photo);
        return photo.getId();
    }

    private Long handleApiPhotoUrl(Long personDbId, String photoUrl, boolean cloneReferencedPhotos) {
        Long photoId;
        try {
            photoId = Long.parseLong(photoUrl.substring("/api/photos/".length()));
        } catch (NumberFormatException e) {
            log.warn("照片引用格式无效 (personDbId: {}, photoUrl: {})", personDbId, photoUrl);
            return null;
        }

        if (cloneReferencedPhotos) {
            Photo clonedPhoto = clonePhotoForPerson(photoId, personDbId);
            return clonedPhoto != null ? clonedPhoto.getId() : null;
        }

        Photo referenced = photoRepository.findById(photoId).orElse(null);
        if (referenced == null) {
            log.warn("Source photo {} was not found for person {}", photoId, personDbId);
            return null;
        }
        if (referenced.getPersonDbId() != null && !referenced.getPersonDbId().equals(personDbId)) {
            // 引用的是别人（或另一个族谱）的照片：克隆一份，避免把原照片改绑走导致对方丢图。
            Photo clonedPhoto = clonePhotoForPerson(photoId, personDbId);
            return clonedPhoto != null ? clonedPhoto.getId() : null;
        }

        referenced.setPersonDbId(personDbId);
        photoRepository.save(referenced);
        return photoId;
    }

    private boolean isLegacyUploadAvatarUrl(String avatarUrl) {
        return extractUploadFileName(avatarUrl) != null;
    }

    private Photo importLegacyUploadPhotoForPerson(String avatarUrl, Long personDbId) {
        String fileName = extractUploadFileName(avatarUrl);
        if (fileName == null || fileName.isBlank()) {
            return null;
        }

        Path uploadRoot = Paths.get("uploads").toAbsolutePath().normalize();
        Path uploadFile = uploadRoot.resolve(fileName).normalize();
        if (!uploadFile.startsWith(uploadRoot)) {
            log.warn("Invalid uploads path detected during import: {}", avatarUrl);
            return null;
        }
        if (!Files.exists(uploadFile)) {
            log.warn("Uploads photo file was not found during import: {}", uploadFile);
            return null;
        }

        try {
            Photo photo = new Photo();
            photo.setPersonDbId(personDbId);
            photo.setMimeType(detectMimeType(fileName));
            photo.setData(Files.readAllBytes(uploadFile));
            return photoRepository.save(photo);
        } catch (IOException e) {
            log.warn("Failed to import uploads photo (avatarUrl: {}): {}", avatarUrl, e.getMessage());
            return null;
        }
    }

    private String extractUploadFileName(String avatarUrl) {
        String path = avatarUrl;
        try {
            path = URI.create(avatarUrl).getPath();
        } catch (Exception ignored) {
        }

        if (path == null || path.isBlank()) {
            return null;
        }

        int uploadIndex = path.indexOf("/uploads/");
        if (uploadIndex < 0) {
            if (path.startsWith("uploads/")) {
                path = "/" + path;
                uploadIndex = 0;
            } else {
                return null;
            }
        }

        String remainder = path.substring(uploadIndex + "/uploads/".length());
        if (remainder.isBlank()) {
            return null;
        }
        return Paths.get(remainder).getFileName().toString();
    }

    private String detectMimeType(String fileName) {
        String lowerName = fileName.toLowerCase();
        if (lowerName.endsWith(".png")) {
            return "image/png";
        }
        if (lowerName.endsWith(".gif")) {
            return "image/gif";
        }
        if (lowerName.endsWith(".webp")) {
            return "image/webp";
        }
        return "image/jpeg";
    }
}
