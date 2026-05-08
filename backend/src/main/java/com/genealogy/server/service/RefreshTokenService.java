package com.genealogy.server.service;

import com.genealogy.server.model.RefreshToken;
import com.genealogy.server.repository.RefreshTokenRepository;
import com.genealogy.server.util.HashUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

@Service
public class RefreshTokenService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final RefreshTokenRepository repository;
    private final long refreshTokenTtl;

    public RefreshTokenService(
            RefreshTokenRepository repository,
            @Value("${app.jwt.refresh-token-ttl}") long refreshTokenTtl) {
        this.repository = repository;
        this.refreshTokenTtl = refreshTokenTtl;
    }

    /**
     * Create a new refresh token for the given user.
     * @return the raw token string (caller must send this to the client; it is NOT stored)
     */
    @Transactional
    public String createRefreshToken(Long userId) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken entity = new RefreshToken();
        entity.setTokenHash(HashUtils.sha256Hex(rawToken));
        entity.setUserId(userId);
        entity.setExpiresAt(Instant.now().plusMillis(refreshTokenTtl));
        repository.save(entity);

        return rawToken;
    }

    /**
     * Validate a raw refresh token. Returns the userId if valid, empty otherwise.
     */
    public Optional<Long> validateRefreshToken(String rawToken) {
        String hash = HashUtils.sha256Hex(rawToken);
        return repository.findByTokenHashAndRevokedFalse(hash)
                .filter(rt -> rt.getExpiresAt().isAfter(Instant.now()))
                .map(RefreshToken::getUserId);
    }

    /**
     * Revoke a specific refresh token (used during logout / rotation).
     */
    @Transactional
    public void revokeRefreshToken(String rawToken) {
        String hash = HashUtils.sha256Hex(rawToken);
        repository.findByTokenHashAndRevokedFalse(hash)
                .ifPresent(rt -> {
                    rt.setRevoked(true);
                    repository.save(rt);
                });
    }

    /**
     * Revoke all refresh tokens for a user (e.g. password change).
     */
    @Transactional
    public void revokeAllForUser(Long userId) {
        repository.revokeAllByUserId(userId);
    }

    @Scheduled(fixedRate = 3600000) // every hour
    @Transactional
    public void cleanupExpiredTokens() {
        repository.deleteByExpiresAtBefore(Instant.now());
    }
}
