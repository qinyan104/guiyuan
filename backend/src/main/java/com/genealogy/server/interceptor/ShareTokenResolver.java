package com.genealogy.server.interceptor;

import com.genealogy.server.auth.ShareSubject;
import com.genealogy.server.model.PublicationShareLink;
import com.genealogy.server.service.ShareLinkService;
import org.springframework.stereotype.Component;

@Component
public class ShareTokenResolver {

    private final ShareLinkService shareLinkService;

    public ShareTokenResolver(ShareLinkService shareLinkService) {
        this.shareLinkService = shareLinkService;
    }

    /**
     * Validate the token and return a ShareSubject enriched with DB-backed fields.
     * Throws NotFoundException (404) or GoneException (410) on invalid/expired tokens.
     */
    public ShareSubject resolveSubject(String token) {
        PublicationShareLink link = shareLinkService.validateToken(token);
        return new ShareSubject(
                link.getId(),
                link.getPublicationId(),
                link.isAllowExport(),
                link.getRedactionProfileJson()
        );
    }
}
