package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.Photo;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PhotoRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/photos")
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
        if (username == null) throw new BadRequestException("未登录");
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("用户不存在"));
        return new UserSubject(user.getId(), user.getRole(), user.getUsername());
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> upload(@RequestParam("file") MultipartFile file,
                                                    @RequestParam("personId") String personId,
                                                    @RequestParam("publicationId") Long publicationId,
                                                    HttpServletRequest request) throws IOException {
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType)) {
            return ApiResponse.error("仅支持 JPG、PNG、GIF、WebP 格式的图片");
        }

        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, publicationId, AccessPermission.EDIT);

        Person person = personRepository.findByPublicationIdAndPersonId(publicationId, personId)
                .orElseThrow(() -> new NotFoundException("人物不存在"));
        // 删除旧照片
        photoRepository.findByPersonDbId(person.getId()).ifPresent(photoRepository::delete);
        Photo photo = new Photo();
        photo.setPersonDbId(person.getId());
        photo.setData(file.getBytes());
        photo.setMimeType(file.getContentType() != null ? file.getContentType() : "image/jpeg");
        photo = photoRepository.save(photo);
        // 关联照片到人物
        person.setPhotoId(photo.getId());
        personRepository.save(person);
        return ApiResponse.success("照片已上传", Map.of("id", photo.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> get(@PathVariable Long id) {
        return photoRepository.findById(id)
                .map(photo -> ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_TYPE, photo.getMimeType())
                        .body(photo.getData()))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        Photo photo = photoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("照片不存在"));
        Person person = personRepository.findById(photo.getPersonDbId())
                .orElseThrow(() -> new NotFoundException("关联人物不存在"));

        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, person.getPublicationId(), AccessPermission.EDIT);

        photoRepository.deleteById(id);
        return ApiResponse.success("照片已删除", null);
    }
}
