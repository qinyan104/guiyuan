package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.ShareSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.interceptor.ShareTokenResolver;
import com.genealogy.server.model.Photo;
import com.genealogy.server.model.PublicationShareLink;
import com.genealogy.server.repository.PhotoRepository;
import com.genealogy.server.repository.PublicationRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import com.genealogy.server.service.PublicationViewProjector;
import com.genealogy.server.service.ShareLinkService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/shares/{token}")
public class SharePublicationController {

    private final ShareTokenResolver shareTokenResolver;
    private final ShareLinkService shareLinkService;
    private final PublicationService publicationService;
    private final PublicationViewProjector viewProjector;
    private final PublicationAuthorizationService authorizationService;
    private final PhotoRepository photoRepository;
    private final PublicationRepository publicationRepository;

    public SharePublicationController(ShareTokenResolver shareTokenResolver,
                                       ShareLinkService shareLinkService,
                                       PublicationService publicationService,
                                       PublicationViewProjector viewProjector,
                                       PublicationAuthorizationService authorizationService,
                                       PhotoRepository photoRepository,
                                       PublicationRepository publicationRepository) {
        this.shareTokenResolver = shareTokenResolver;
        this.shareLinkService = shareLinkService;
        this.publicationService = publicationService;
        this.viewProjector = viewProjector;
        this.authorizationService = authorizationService;
        this.photoRepository = photoRepository;
        this.publicationRepository = publicationRepository;
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> getPublication(@PathVariable String token) {
        ShareSubject subject = shareTokenResolver.resolveSubject(token);
        Map<String, Object> fullData = publicationService.loadPublication(subject.getSharePublicationId());
        Map<String, Object> redacted = viewProjector.projectRedacted(fullData, subject, token);
        return ApiResponse.success(redacted);
    }

    @GetMapping("/meta")
    public ApiResponse<Map<String, Object>> getMeta(@PathVariable String token) {
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

    @GetMapping("/photos/{photoId}")
    public ResponseEntity<byte[]> getPhoto(@PathVariable String token, @PathVariable Long photoId) {
        shareTokenResolver.resolveSubject(token);
        return photoRepository.findById(photoId)
                .map(photo -> ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_TYPE, photo.getMimeType())
                        .body(photo.getData()))
                .orElse(ResponseEntity.notFound().build());
    }
}
