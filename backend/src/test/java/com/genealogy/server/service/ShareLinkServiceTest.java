package com.genealogy.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.GoneException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.PublicationShareLink;
import com.genealogy.server.repository.PublicationShareLinkRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShareLinkServiceTest {

    @Mock
    private PublicationShareLinkRepository shareLinkRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private ShareLinkService service;

    @Captor
    private ArgumentCaptor<PublicationShareLink> linkCaptor;

    @BeforeEach
    void setUp() {
        service = new ShareLinkService(shareLinkRepository, objectMapper);
    }

    @Test
    void createShareLink_returnsTokenAndMetadata() {
        when(shareLinkRepository.countByPublicationIdAndStatus(1L, "ACTIVE")).thenReturn(0L);
        when(shareLinkRepository.save(any())).thenAnswer(invocation -> {
            PublicationShareLink saved = invocation.getArgument(0);
            saved.setId(99L);
            return saved;
        });

        Map<String, Object> result = service.createShareLink(1L, 10L, true, Map.of(), Duration.ofDays(7));

        assertThat(result).containsKeys("token", "id", "expiresAt");
        assertThat(result.get("id")).isEqualTo(99L);
        assertThat((String) result.get("token")).isNotBlank();
    }

    @Test
    void createShareLink_exceedsMaxActive_throwsBadRequest() {
        when(shareLinkRepository.countByPublicationIdAndStatus(1L, "ACTIVE")).thenReturn(20L);

        assertThatThrownBy(() -> service.createShareLink(1L, 10L, true, Map.of(), Duration.ofDays(7)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("上限");
    }

    @Test
    void validateToken_validLink_returnsLink() {
        String plaintext = "test-validate-token";
        String hash = com.genealogy.server.util.HashUtils.sha256Hex(plaintext);
        PublicationShareLink link = new PublicationShareLink();
        link.setId(1L);
        link.setStatus("ACTIVE");
        link.setExpiresAt(LocalDateTime.now().plusDays(1));

        when(shareLinkRepository.findByTokenHash(hash)).thenReturn(Optional.of(link));

        PublicationShareLink result = service.validateToken(plaintext);
        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    void validateToken_revoked_throwsGone() {
        String plaintext = "revoked-token";
        String hash = com.genealogy.server.util.HashUtils.sha256Hex(plaintext);
        PublicationShareLink link = new PublicationShareLink();
        link.setStatus("REVOKED");

        when(shareLinkRepository.findByTokenHash(hash)).thenReturn(Optional.of(link));

        assertThatThrownBy(() -> service.validateToken(plaintext))
                .isInstanceOf(GoneException.class)
                .hasMessage("分享链接已撤销");
    }

    @Test
    void validateToken_expiredStatus_throwsGone() {
        String plaintext = "expired-status-token";
        String hash = com.genealogy.server.util.HashUtils.sha256Hex(plaintext);
        PublicationShareLink link = new PublicationShareLink();
        link.setStatus("EXPIRED");

        when(shareLinkRepository.findByTokenHash(hash)).thenReturn(Optional.of(link));

        assertThatThrownBy(() -> service.validateToken(plaintext))
                .isInstanceOf(GoneException.class)
                .hasMessage("分享链接已过期");
    }

    @Test
    void validateToken_expiredByTimestamp_throwsGone() {
        String plaintext = "timestamp-expired-token";
        String hash = com.genealogy.server.util.HashUtils.sha256Hex(plaintext);
        PublicationShareLink link = new PublicationShareLink();
        link.setStatus("ACTIVE");
        link.setExpiresAt(LocalDateTime.now().minusDays(1));

        when(shareLinkRepository.findByTokenHash(hash)).thenReturn(Optional.of(link));

        assertThatThrownBy(() -> service.validateToken(plaintext))
                .isInstanceOf(GoneException.class)
                .hasMessage("分享链接已过期");
    }

    @Test
    void validateToken_notFound_throwsNotFound() {
        String plaintext = "nonexistent-token";
        String hash = com.genealogy.server.util.HashUtils.sha256Hex(plaintext);

        when(shareLinkRepository.findByTokenHash(hash)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.validateToken(plaintext))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("分享链接不存在");
    }

    @Test
    void listShareLinks_returnsAllForPublication() {
        PublicationShareLink link1 = new PublicationShareLink();
        link1.setId(1L);
        link1.setStatus("ACTIVE");
        PublicationShareLink link2 = new PublicationShareLink();
        link2.setId(2L);
        link2.setStatus("REVOKED");

        when(shareLinkRepository.findByPublicationIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(link1, link2));

        List<Map<String, Object>> result = service.listShareLinks(1L);
        assertThat(result).hasSize(2);
        assertThat(result.get(0).get("id")).isEqualTo(1L);
        assertThat(result.get(1).get("id")).isEqualTo(2L);
    }

    @Test
    void revokeShareLink_setsRevokedStatus() {
        PublicationShareLink link = new PublicationShareLink();
        link.setId(1L);
        link.setPublicationId(1L);
        link.setStatus("ACTIVE");

        when(shareLinkRepository.findById(1L)).thenReturn(Optional.of(link));
        when(shareLinkRepository.save(any())).thenReturn(link);

        service.revokeShareLink(1L, 1L);

        assertThat(link.getStatus()).isEqualTo("REVOKED");
        assertThat(link.getRevokedAt()).isNotNull();
    }

    @Test
    void revokeShareLink_wrongPublication_throwsNotFound() {
        PublicationShareLink link = new PublicationShareLink();
        link.setId(1L);
        link.setPublicationId(1L);

        when(shareLinkRepository.findById(1L)).thenReturn(Optional.of(link));

        assertThatThrownBy(() -> service.revokeShareLink(1L, 999L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void revokeShareLink_notFound_throwsNotFound() {
        when(shareLinkRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.revokeShareLink(999L, 1L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("分享链接不存在");
    }
}
