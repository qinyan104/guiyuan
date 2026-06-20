package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.Photo;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PhotoRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/photos")
@Tag(name = "照片", description = "人物照片管理")
public class PhotoController {

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );

    private final PhotoRepository photoRepository;
    private final PersonRepository personRepository;
    private final UserRepository userRepository;
    private final PublicationAuthorizationService authorizationService;

    public PhotoController(PhotoRepository photoRepository, PersonRepository personRepository,
                           UserRepository userRepository, PublicationAuthorizationService authorizationService) {
        this.photoRepository = photoRepository;
        this.personRepository = personRepository;
        this.userRepository = userRepository;
        this.authorizationService = authorizationService;
    }

    private UserSubject resolveSubject(HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        if (username == null) {
            throw new ForbiddenException("未登录");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ForbiddenException("未登录"));
        return new UserSubject(user.getId(), user.getRole(), user.getUsername());
    }

    @Operation(summary = "上传照片", description = "为族谱中的人物上传照片")
    @PostMapping
    @Transactional
    public ApiResponse<Map<String, Object>> upload(@Parameter(description = "照片文件") @RequestParam("file") MultipartFile file,
                                                   @Parameter(description = "人物ID") @RequestParam("personId") String personId,
                                                   @Parameter(description = "族谱ID") @RequestParam("publicationId") Long publicationId,
                                                   HttpServletRequest request) throws IOException {
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType)) {
            return ApiResponse.error("仅支持 JPG、PNG、GIF、WebP 格式的图片");
        }

        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, publicationId, AccessPermission.EDIT);

        Person person = personRepository.findByPublicationIdAndPersonId(publicationId, personId)
                .orElseThrow(() -> new NotFoundException("人物不存在"));

        photoRepository.findByPersonDbId(person.getId()).ifPresent(photoRepository::delete);

        Photo photo = new Photo();
        photo.setPersonDbId(person.getId());
        photo.setData(file.getBytes());
        photo.setMimeType(contentType);
        photo = photoRepository.save(photo);

        person.setPhotoId(photo.getId());
        personRepository.save(person);

        return ApiResponse.success("上传成功", Map.of("id", photo.getId()));
    }

    @Operation(summary = "获取照片", description = "根据ID获取照片数据")
    @GetMapping("/{id}")
    public ResponseEntity<byte[]> get(@Parameter(description = "照片ID") @PathVariable Long id, HttpServletRequest request) {
        Photo photo = photoRepository.findById(id).orElse(null);
        if (photo == null) {
            return ResponseEntity.notFound().build();
        }

        Person person = personRepository.findById(photo.getPersonDbId()).orElse(null);
        if (person == null) {
            return ResponseEntity.notFound().build();
        }

        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, person.getPublicationId(), AccessPermission.READ_FULL);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, photo.getMimeType())
                .body(photo.getData());
    }

    @Operation(summary = "删除照片", description = "删除指定的人物照片")
    @DeleteMapping("/{id}")
    @Transactional
    public ApiResponse<Void> delete(@Parameter(description = "照片ID") @PathVariable Long id, HttpServletRequest request) {
        Photo photo = photoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("照片不存在"));
        Person person = personRepository.findById(photo.getPersonDbId())
                .orElseThrow(() -> new NotFoundException("关联人物不存在"));

        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, person.getPublicationId(), AccessPermission.EDIT);

        if (id.equals(person.getPhotoId())) {
            person.setPhotoId(null);
            personRepository.save(person);
        }
        photoRepository.delete(photo);

        return ApiResponse.success("删除成功", null);
    }
}
