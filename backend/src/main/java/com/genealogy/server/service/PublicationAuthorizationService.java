package com.genealogy.server.service;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.AccessSubject;
import com.genealogy.server.auth.ShareSubject;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.repository.PublicationAccessRepository;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class PublicationAuthorizationService {

    private static final Map<String, Set<AccessPermission>> ROLE_PERMISSIONS = Map.of(
        "OWNER", Set.of(
            AccessPermission.READ_FULL,
            AccessPermission.READ_REDACTED,
            AccessPermission.EDIT,
            AccessPermission.DELETE,
            AccessPermission.HISTORY_READ,
            AccessPermission.EXPORT_FULL,
            AccessPermission.EXPORT_REDACTED,
            AccessPermission.MANAGE_ACCESS,
            AccessPermission.MANAGE_SHARES
        ),
        "EDITOR", Set.of(
            AccessPermission.READ_FULL,
            AccessPermission.READ_REDACTED,
            AccessPermission.EDIT,
            AccessPermission.HISTORY_READ,
            AccessPermission.EXPORT_FULL,
            AccessPermission.EXPORT_REDACTED
        ),
        "VIEWER", Set.of(
            AccessPermission.READ_FULL,
            AccessPermission.READ_REDACTED,
            AccessPermission.HISTORY_READ
        )
    );

    private final PublicationAccessRepository accessRepository;

    public PublicationAuthorizationService(PublicationAccessRepository accessRepository) {
        this.accessRepository = accessRepository;
    }

    public boolean can(AccessSubject subject, Long publicationId, AccessPermission permission) {
        if (subject instanceof ShareSubject share) {
            return canShare(share, publicationId, permission);
        }
        if (subject instanceof UserSubject user) {
            return canUser(user, publicationId, permission);
        }
        return false;
    }

    public void require(AccessSubject subject, Long publicationId, AccessPermission permission) {
        if (!can(subject, publicationId, permission)) {
            if (subject instanceof UserSubject user) {
                Optional<PublicationAccess> access = accessRepository.findByPublicationIdAndUserId(publicationId, user.getUserId());
                if (access.isEmpty()) {
                    throw new NotFoundException("族谱不存在");
                }
            }
            throw new ForbiddenException("权限不足，无法执行此操作");
        }
    }

    private boolean canUser(UserSubject user, Long publicationId, AccessPermission permission) {
        Optional<PublicationAccess> access = accessRepository.findByPublicationIdAndUserId(publicationId, user.getUserId());
        if (access.isEmpty()) {
            return false;
        }
        Set<AccessPermission> allowed = ROLE_PERMISSIONS.get(access.get().getRole());
        return allowed != null && allowed.contains(permission);
    }

    private boolean canShare(ShareSubject share, Long publicationId, AccessPermission permission) {
        if (!publicationId.equals(share.getSharePublicationId())) {
            return false;
        }
        if (permission == AccessPermission.READ_REDACTED) {
            return true;
        }
        if (permission == AccessPermission.EXPORT_REDACTED) {
            return share.isAllowExport();
        }
        return false;
    }
}
