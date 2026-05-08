package com.genealogy.server.service;

import com.genealogy.server.model.RefreshToken;
import com.genealogy.server.repository.RefreshTokenRepository;
import com.genealogy.server.util.HashUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    private static final long TTL = 2_592_000_000L; // 30 days

    @Mock
    private RefreshTokenRepository repository;

    private RefreshTokenService service;

    @Captor
    private ArgumentCaptor<RefreshToken> tokenCaptor;

    @BeforeEach
    void setUp() {
        service = new RefreshTokenService(repository, TTL);
    }

    @Test
    void createRefreshToken_returnsRawTokenAndSavesHash() {
        String rawToken = service.createRefreshToken(1L);

        assertThat(rawToken).isNotBlank();

        verify(repository).save(tokenCaptor.capture());
        RefreshToken saved = tokenCaptor.getValue();
        assertThat(saved.getTokenHash()).isEqualTo(HashUtils.sha256Hex(rawToken));
        assertThat(saved.getUserId()).isEqualTo(1L);
        assertThat(saved.getExpiresAt()).isAfter(Instant.now());
    }

    @Test
    void validateRefreshToken_validToken_returnsUserId() {
        String rawToken = "valid-refresh-token-123";
        String hash = HashUtils.sha256Hex(rawToken);
        RefreshToken entity = new RefreshToken();
        entity.setTokenHash(hash);
        entity.setUserId(42L);
        entity.setRevoked(false);
        entity.setExpiresAt(Instant.now().plusSeconds(3600));

        when(repository.findByTokenHashAndRevokedFalse(hash)).thenReturn(Optional.of(entity));

        Optional<Long> result = service.validateRefreshToken(rawToken);
        assertThat(result).hasValue(42L);
    }

    @Test
    void validateRefreshToken_expiredToken_returnsEmpty() {
        String rawToken = "expired-refresh-token";
        String hash = HashUtils.sha256Hex(rawToken);
        RefreshToken entity = new RefreshToken();
        entity.setTokenHash(hash);
        entity.setUserId(42L);
        entity.setRevoked(false);
        entity.setExpiresAt(Instant.now().minusSeconds(3600));

        when(repository.findByTokenHashAndRevokedFalse(hash)).thenReturn(Optional.of(entity));

        Optional<Long> result = service.validateRefreshToken(rawToken);
        assertThat(result).isEmpty();
    }

    @Test
    void validateRefreshToken_revokedToken_returnsEmpty() {
        String rawToken = "revoked-refresh-token";
        String hash = HashUtils.sha256Hex(rawToken);
        RefreshToken entity = new RefreshToken();
        entity.setRevoked(true);
        entity.setExpiresAt(Instant.now().plusSeconds(3600));

        // Repository only returns non-revoked tokens, so this returns empty
        when(repository.findByTokenHashAndRevokedFalse(hash)).thenReturn(Optional.empty());

        Optional<Long> result = service.validateRefreshToken(rawToken);
        assertThat(result).isEmpty();
    }

    @Test
    void validateRefreshToken_unknownToken_returnsEmpty() {
        String rawToken = "unknown-token";
        String hash = HashUtils.sha256Hex(rawToken);

        when(repository.findByTokenHashAndRevokedFalse(hash)).thenReturn(Optional.empty());

        Optional<Long> result = service.validateRefreshToken(rawToken);
        assertThat(result).isEmpty();
    }

    @Test
    void revokeRefreshToken_marksAsRevoked() {
        String rawToken = "revoke-me-token";
        String hash = HashUtils.sha256Hex(rawToken);
        RefreshToken entity = new RefreshToken();
        entity.setRevoked(false);

        when(repository.findByTokenHashAndRevokedFalse(hash)).thenReturn(Optional.of(entity));

        service.revokeRefreshToken(rawToken);
        assertThat(entity.isRevoked()).isTrue();
        verify(repository).save(entity);
    }

    @Test
    void revokeRefreshToken_unknownToken_doesNothing() {
        String rawToken = "unknown-revoke-token";
        String hash = HashUtils.sha256Hex(rawToken);

        when(repository.findByTokenHashAndRevokedFalse(hash)).thenReturn(Optional.empty());

        service.revokeRefreshToken(rawToken);
        verify(repository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void revokeAllForUser_callsRepository() {
        service.revokeAllForUser(1L);
        verify(repository).revokeAllByUserId(1L);
    }
}
