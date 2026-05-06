package com.genealogy.server.auth;

public class ShareSubject implements AccessSubject {

    private final Long shareLinkId;
    private final Long publicationId;

    public ShareSubject(Long shareLinkId, Long publicationId) {
        this.shareLinkId = shareLinkId;
        this.publicationId = publicationId;
    }

    @Override
    public SubjectType getType() { return SubjectType.SHARE; }

    @Override
    public Long getUserId() { return null; }

    @Override
    public String getPlatformRole() { return null; }

    @Override
    public Long getSharePublicationId() { return publicationId; }

    public Long getShareLinkId() { return shareLinkId; }
}
