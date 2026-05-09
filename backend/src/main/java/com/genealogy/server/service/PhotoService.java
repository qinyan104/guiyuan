package com.genealogy.server.service;

import com.genealogy.server.model.Photo;
import com.genealogy.server.repository.PhotoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public void reassignPhoto(Long personDbId, Long photoId) {
        photoRepository.findById(photoId).ifPresent(photo -> {
            photo.setPersonDbId(personDbId);
            photoRepository.save(photo);
        });
    }

    private Long handleBase64Avatar(Long personDbId, String base64Url) {
        try {
            int commaIndex = base64Url.indexOf(",");
            if (commaIndex == -1) return null;

            String header = base64Url.substring(0, commaIndex);
            String mimeType = header.substring(header.indexOf(":") + 1, header.indexOf(";"));
            String base64Data = base64Url.substring(commaIndex + 1).replaceAll("\\s", "");
            byte[] dataBytes = Base64.getMimeDecoder().decode(base64Data);

            log.info("正在导入 Base64 头像 (personDbId: {}, mimeType: {}, size: {} bytes)", personDbId, mimeType, dataBytes.length);

            Photo photo = new Photo();
            photo.setMimeType(mimeType);
            photo.setData(dataBytes);
            photo.setPersonDbId(personDbId);
            photo = photoRepository.save(photo);
            return photo.getId();
        } catch (Exception e) {
            log.error("解析 Base64 头像失败 (personDbId: {}): {}", personDbId, e.getMessage(), e);
            return null;
        }
    }

    private Long handleApiPhotoUrl(Long personDbId, String photoUrl, boolean cloneReferencedPhotos) {
        try {
            Long photoId = Long.parseLong(photoUrl.substring("/api/photos/".length()));
            if (cloneReferencedPhotos) {
                Photo clonedPhoto = clonePhotoForPerson(photoId, personDbId);
                return clonedPhoto != null ? clonedPhoto.getId() : null;
            } else {
                reassignPhoto(personDbId, photoId);
                return photoId;
            }
        } catch (Exception e) {
            log.warn("导入照片引用失败 (personDbId: {}, photoUrl: {}): {}", personDbId, photoUrl, e.getMessage());
            return null;
        }
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
