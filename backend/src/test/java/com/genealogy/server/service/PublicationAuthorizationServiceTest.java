package com.genealogy.server.service;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.ShareSubject;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.repository.PublicationAccessRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicationAuthorizationServiceTest {

    @Mock
    private PublicationAccessRepository accessRepository;

    private PublicationAuthorizationService service;

    private static final Long PUB_ID = 1L;
    private static final Long OWNER_USER_ID = 10L;
    private static final Long EDITOR_USER_ID = 20L;
    private static final Long VIEWER_USER_ID = 30L;
    private static final Long OUTSIDER_USER_ID = 40L;

    @BeforeEach
    void setUp() {
        service = new PublicationAuthorizationService(accessRepository);
    }

    private PublicationAccess makeAccess(Long pubId, Long userId, String role) {
        PublicationAccess a = new PublicationAccess();
        a.setPublicationId(pubId);
        a.setUserId(userId);
        a.setRole(role);
        return a;
    }

    // --- OWNER tests ---

    @Test
    void ownerCanReadFull() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, OWNER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, OWNER_USER_ID, "OWNER")));
        assertThat(service.can(new UserSubject(OWNER_USER_ID, "USER", "owner"), PUB_ID, AccessPermission.READ_FULL)).isTrue();
    }

    @Test
    void ownerCanEdit() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, OWNER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, OWNER_USER_ID, "OWNER")));
        assertThat(service.can(new UserSubject(OWNER_USER_ID, "USER", "owner"), PUB_ID, AccessPermission.EDIT)).isTrue();
    }

    @Test
    void ownerCanDelete() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, OWNER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, OWNER_USER_ID, "OWNER")));
        assertThat(service.can(new UserSubject(OWNER_USER_ID, "USER", "owner"), PUB_ID, AccessPermission.DELETE)).isTrue();
    }

    @Test
    void ownerCanManageAccess() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, OWNER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, OWNER_USER_ID, "OWNER")));
        assertThat(service.can(new UserSubject(OWNER_USER_ID, "USER", "owner"), PUB_ID, AccessPermission.MANAGE_ACCESS)).isTrue();
    }

    // --- EDITOR tests ---

    @Test
    void editorCanReadFull() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, EDITOR_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, EDITOR_USER_ID, "EDITOR")));
        assertThat(service.can(new UserSubject(EDITOR_USER_ID, "USER", "editor"), PUB_ID, AccessPermission.READ_FULL)).isTrue();
    }

    @Test
    void editorCanEdit() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, EDITOR_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, EDITOR_USER_ID, "EDITOR")));
        assertThat(service.can(new UserSubject(EDITOR_USER_ID, "USER", "editor"), PUB_ID, AccessPermission.EDIT)).isTrue();
    }

    @Test
    void editorCannotDelete() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, EDITOR_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, EDITOR_USER_ID, "EDITOR")));
        assertThat(service.can(new UserSubject(EDITOR_USER_ID, "USER", "editor"), PUB_ID, AccessPermission.DELETE)).isFalse();
    }

    @Test
    void editorCannotManageAccess() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, EDITOR_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, EDITOR_USER_ID, "EDITOR")));
        assertThat(service.can(new UserSubject(EDITOR_USER_ID, "USER", "editor"), PUB_ID, AccessPermission.MANAGE_ACCESS)).isFalse();
    }

    // --- VIEWER tests ---

    @Test
    void viewerCanReadFull() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, VIEWER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, VIEWER_USER_ID, "VIEWER")));
        assertThat(service.can(new UserSubject(VIEWER_USER_ID, "USER", "viewer"), PUB_ID, AccessPermission.READ_FULL)).isTrue();
    }

    @Test
    void viewerCannotEdit() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, VIEWER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, VIEWER_USER_ID, "VIEWER")));
        assertThat(service.can(new UserSubject(VIEWER_USER_ID, "USER", "viewer"), PUB_ID, AccessPermission.EDIT)).isFalse();
    }

    @Test
    void viewerCannotDelete() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, VIEWER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, VIEWER_USER_ID, "VIEWER")));
        assertThat(service.can(new UserSubject(VIEWER_USER_ID, "USER", "viewer"), PUB_ID, AccessPermission.DELETE)).isFalse();
    }

    @Test
    void viewerCannotExport() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, VIEWER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, VIEWER_USER_ID, "VIEWER")));
        assertThat(service.can(new UserSubject(VIEWER_USER_ID, "USER", "viewer"), PUB_ID, AccessPermission.EXPORT_FULL)).isFalse();
    }

    // --- Outsider tests ---

    @Test
    void outsiderCannotRead() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, OUTSIDER_USER_ID))
                .thenReturn(Optional.empty());
        assertThat(service.can(new UserSubject(OUTSIDER_USER_ID, "USER", "outsider"), PUB_ID, AccessPermission.READ_FULL)).isFalse();
    }

    @Test
    void requireThrowsNotFoundForOutsider() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, OUTSIDER_USER_ID))
                .thenReturn(Optional.empty());
        UserSubject outsider = new UserSubject(OUTSIDER_USER_ID, "USER", "outsider");
        assertThatThrownBy(() -> service.require(outsider, PUB_ID, AccessPermission.READ_FULL))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("族谱不存在");
    }

    @Test
    void requireThrowsForbiddenForInsufficientPermission() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, VIEWER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, VIEWER_USER_ID, "VIEWER")));
        UserSubject viewer = new UserSubject(VIEWER_USER_ID, "USER", "viewer");
        assertThatThrownBy(() -> service.require(viewer, PUB_ID, AccessPermission.EDIT))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("权限不足，无法执行此操作");
    }

    // --- ShareSubject tests ---

    @Test
    void shareCanReadRedacted() {
        ShareSubject share = new ShareSubject(99L, PUB_ID, false, "{}");
        assertThat(service.can(share, PUB_ID, AccessPermission.READ_REDACTED)).isTrue();
    }

    @Test
    void shareCannotReadFull() {
        ShareSubject share = new ShareSubject(99L, PUB_ID, false, "{}");
        assertThat(service.can(share, PUB_ID, AccessPermission.READ_FULL)).isFalse();
    }

    @Test
    void shareCannotEdit() {
        ShareSubject share = new ShareSubject(99L, PUB_ID, false, "{}");
        assertThat(service.can(share, PUB_ID, AccessPermission.EDIT)).isFalse();
    }

    @Test
    void shareCannotAccessDifferentPublication() {
        ShareSubject share = new ShareSubject(99L, PUB_ID, false, "{}");
        assertThat(service.can(share, 999L, AccessPermission.READ_REDACTED)).isFalse();
    }

    @Test
    void shareCanExportWhenAllowed() {
        ShareSubject share = new ShareSubject(99L, PUB_ID, true, "{}");
        assertThat(service.can(share, PUB_ID, AccessPermission.EXPORT_REDACTED)).isTrue();
    }

    @Test
    void shareCannotExportWhenNotAllowed() {
        ShareSubject share = new ShareSubject(99L, PUB_ID, false, "{}");
        assertThat(service.can(share, PUB_ID, AccessPermission.EXPORT_REDACTED)).isFalse();
    }
}
