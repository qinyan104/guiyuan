package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.ShareSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.interceptor.ShareTokenResolver;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.Photo;
import com.genealogy.server.model.PublicationShareLink;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PhotoRepository;
import com.genealogy.server.repository.PublicationRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import com.genealogy.server.service.PublicationViewProjector;
import com.genealogy.server.service.ShareLinkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/shares/{token}")
@Tag(name = "分享", description = "族谱公开分享链接")
public class SharePublicationController {

    private final ShareTokenResolver shareTokenResolver;
    private final ShareLinkService shareLinkService;
    private final PublicationService publicationService;
    private final PublicationViewProjector viewProjector;
    private final PublicationAuthorizationService authorizationService;
    private final PhotoRepository photoRepository;
    private final PersonRepository personRepository;
    private final PublicationRepository publicationRepository;

    public SharePublicationController(ShareTokenResolver shareTokenResolver,
                                       ShareLinkService shareLinkService,
                                       PublicationService publicationService,
                                       PublicationViewProjector viewProjector,
                                       PublicationAuthorizationService authorizationService,
                                       PhotoRepository photoRepository,
                                       PersonRepository personRepository,
                                       PublicationRepository publicationRepository) {
        this.shareTokenResolver = shareTokenResolver;
        this.shareLinkService = shareLinkService;
        this.publicationService = publicationService;
        this.viewProjector = viewProjector;
        this.authorizationService = authorizationService;
        this.photoRepository = photoRepository;
        this.personRepository = personRepository;
        this.publicationRepository = publicationRepository;
    }

    @Operation(summary = "获取分享族谱", description = "通过分享链接获取族谱数据（脱敏后）")
    @GetMapping
    public ApiResponse<Map<String, Object>> getPublication(@Parameter(description = "分享令牌") @PathVariable String token) {
        ShareSubject subject = shareTokenResolver.resolveSubject(token);
        Map<String, Object> fullData = publicationService.loadPublication(subject.getSharePublicationId());
        Map<String, Object> redacted = viewProjector.projectRedacted(fullData, subject, token);
        return ApiResponse.success(redacted);
    }

    @Operation(summary = "获取分享元数据", description = "获取分享链接的元数据信息")
    @GetMapping("/meta")
    public ApiResponse<Map<String, Object>> getMeta(@Parameter(description = "分享令牌") @PathVariable String token) {
        ShareSubject subject = shareTokenResolver.resolveSubject(token);
        PublicationShareLink link = shareLinkService.validateToken(token);

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("publicationId", link.getPublicationId());
        meta.put("allowExport", link.isAllowExport());
        meta.put("expiresAt", link.getExpiresAt() != null ? link.getExpiresAt().toString() : null);
        meta.put("createdAt", link.getCreatedAt() != null ? link.getCreatedAt().toString() : null);

        publicationRepository.findById(link.getPublicationId()).ifPresent(pub -> {
            meta.put("title", pub.getTitle());
            meta.put("subtitle", pub.getSubtitle());
        });

        return ApiResponse.success(meta);
    }

    @Operation(summary = "获取分享照片", description = "通过分享链接获取族谱中的照片")
    @GetMapping("/photos/{photoId}")
    public ResponseEntity<byte[]> getPhoto(@Parameter(description = "分享令牌") @PathVariable String token, @Parameter(description = "照片ID") @PathVariable Long photoId) {
        ShareSubject subject = shareTokenResolver.resolveSubject(token);
        Long sharedPubId = subject.getSharePublicationId();

        Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new NotFoundException("照片不存在"));
        Person person = personRepository.findById(photo.getPersonDbId())
                .orElse(null);
        if (person == null || !sharedPubId.equals(person.getPublicationId())) {
            throw new ForbiddenException("无权访问该照片");
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, photo.getMimeType())
                .body(photo.getData());
    }
}
