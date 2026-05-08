package com.genealogy.server.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.GoneException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.PublicationShareLink;
import com.genealogy.server.repository.PublicationShareLinkRepository;
import com.genealogy.server.util.HashUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ShareLinkService {

    private static final int MAX_ACTIVE_PER_PUB = 20;
    private static final int TOKEN_BYTES = 32;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PublicationShareLinkRepository shareLinkRepository;
    private final ObjectMapper objectMapper;

    public ShareLinkService(PublicationShareLinkRepository shareLinkRepository, ObjectMapper objectMapper) {
        this.shareLinkRepository = shareLinkRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Create a share link. Returns the plaintext token (only time it is available).
     */
    @Transactional
    public Map<String, Object> createShareLink(Long publicationId, Long createdBy,
                                                boolean allowExport,
                                                Map<String, Object> redactionProfile,
                                                Duration ttl) {
        long activeCount = shareLinkRepository.countByPublicationIdAndStatus(publicationId, "ACTIVE");
        if (activeCount >= MAX_ACTIVE_PER_PUB) {
            throw new BadRequestException("该族谱的分享链接数量已达上限（" + MAX_ACTIVE_PER_PUB + " 条）");
        }

        String plaintextToken = generateToken();
        String tokenHash = HashUtils.sha256Hex(plaintextToken);

        Map<String, Object> profile = redactionProfile != null ? redactionProfile : PublicationViewProjector.DEFAULT_REDACTION_PROFILE;
        String profileJson;
        try {
            profileJson = objectMapper.writeValueAsString(profile);
        } catch (JsonProcessingException e) {
            profileJson = "{}";
        }

        PublicationShareLink link = new PublicationShareLink();
        link.setPublicationId(publicationId);
        link.setTokenHash(tokenHash);
        link.setStatus("ACTIVE");
        link.setExpiresAt(LocalDateTime.now().plus(ttl));
        link.setAllowExport(allowExport);
        link.setRedactionProfileJson(profileJson);
        link.setCreatedBy(createdBy);
        link = shareLinkRepository.save(link);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", plaintextToken);
        result.put("id", link.getId());
        result.put("expiresAt", link.getExpiresAt().toString());
        return result;
    }

    /**
     * Validate a plaintext token. Returns the share link entity or throws 404/410.
     */
    public PublicationShareLink validateToken(String plaintextToken) {
        String tokenHash = HashUtils.sha256Hex(plaintextToken);
        PublicationShareLink link = shareLinkRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new NotFoundException("分享链接不存在"));

        if ("REVOKED".equals(link.getStatus())) {
            throw new GoneException("分享链接已撤销");
        }
        if ("EXPIRED".equals(link.getStatus()) ||
                (link.getExpiresAt() != null && link.getExpiresAt().isBefore(LocalDateTime.now()))) {
            throw new GoneException("分享链接已过期");
        }

        return link;
    }

    /**
     * List share links for a publication. Does not expose token hash.
     */
    public List<Map<String, Object>> listShareLinks(Long publicationId) {
        return shareLinkRepository.findByPublicationIdOrderByCreatedAtDesc(publicationId)
                .stream()
                .map(link -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", link.getId());
                    item.put("status", link.getStatus());
                    item.put("allowExport", link.isAllowExport());
                    item.put("expiresAt", link.getExpiresAt() != null ? link.getExpiresAt().toString() : null);
                    item.put("createdAt", link.getCreatedAt() != null ? link.getCreatedAt().toString() : null);
                    item.put("revokedAt", link.getRevokedAt() != null ? link.getRevokedAt().toString() : null);
                    boolean expired = link.getExpiresAt() != null && link.getExpiresAt().isBefore(LocalDateTime.now());
                    item.put("expired", expired);
                    return item;
                })
                .toList();
    }

    /**
     * Revoke a share link.
     */
    @Transactional
    public void revokeShareLink(Long shareLinkId, Long publicationId) {
        PublicationShareLink link = shareLinkRepository.findById(shareLinkId)
                .orElseThrow(() -> new NotFoundException("分享链接不存在"));
        if (!link.getPublicationId().equals(publicationId)) {
            throw new NotFoundException("分享链接不存在");
        }
        link.setStatus("REVOKED");
        link.setRevokedAt(LocalDateTime.now());
        shareLinkRepository.save(link);
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

}
