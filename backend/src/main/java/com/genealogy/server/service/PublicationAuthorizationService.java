package com.genealogy.server.service;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.AccessSubject;
import com.genealogy.server.auth.ShareSubject;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.model.Publication;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.PublicationRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

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

    private static final Set<AccessPermission> OWNER_PERMISSIONS = ROLE_PERMISSIONS.get("OWNER");

    private final PublicationAccessRepository accessRepository;
    private final PublicationRepository publicationRepository;

    public PublicationAuthorizationService(PublicationAccessRepository accessRepository,
                                           PublicationRepository publicationRepository) {
        this.accessRepository = accessRepository;
        this.publicationRepository = publicationRepository;
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
                Optional<PublicationAccess> access = resolveCachedAccess(publicationId, user.getUserId());
                if (access.isEmpty()) {
                    throw new ForbiddenException("没有权限访问该族谱");
                }
            }
            throw new ForbiddenException("权限不足，无法执行此操作");
        }
    }

    private boolean canUser(UserSubject user, Long publicationId, AccessPermission permission) {
        // 1. Check publication_access table first (with request-level caching)
        Optional<PublicationAccess> access = resolveCachedAccess(publicationId, user.getUserId());
        if (access.isPresent()) {
            Set<AccessPermission> allowed = ROLE_PERMISSIONS.get(access.get().getRole());
            return allowed != null && allowed.contains(permission);
        }

        // 2. Fallback: check if user is the publication owner (for migration safety)
        var publicationOwner = publicationRepository.findById(publicationId)
                .map(Publication::getUserId);
        if (publicationOwner.isPresent() && publicationOwner.get().equals(user.getUserId())) {
            return OWNER_PERMISSIONS.contains(permission);
        }

        return false;
    }

    @SuppressWarnings("unchecked")
    private Optional<PublicationAccess> resolveCachedAccess(Long pubId, Long userId) {
        HttpServletRequest request = getCurrentRequest();
        if (request == null) {
            return accessRepository.findByPublicationIdAndUserId(pubId, userId);
        }

        String key = "cachedAccess_" + pubId + "_" + userId;
        Optional<PublicationAccess> cached = (Optional<PublicationAccess>) request.getAttribute(key);
        if (cached != null) return cached;

        Optional<PublicationAccess> access = accessRepository.findByPublicationIdAndUserId(pubId, userId);
        request.setAttribute(key, access);
        return access;
    }

    private HttpServletRequest getCurrentRequest() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return attrs != null ? attrs.getRequest() : null;
        } catch (Exception e) {
            return null;
        }
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
