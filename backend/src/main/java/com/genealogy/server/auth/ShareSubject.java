package com.genealogy.server.auth;

public class ShareSubject implements AccessSubject {

    private final Long shareLinkId;
    private final Long publicationId;
    private final boolean allowExport;
    private final String redactionProfileJson;

    public ShareSubject(Long shareLinkId, Long publicationId, boolean allowExport, String redactionProfileJson) {
        this.shareLinkId = shareLinkId;
        this.publicationId = publicationId;
        this.allowExport = allowExport;
        this.redactionProfileJson = redactionProfileJson;
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

    public boolean isAllowExport() { return allowExport; }

    public String getRedactionProfileJson() { return redactionProfileJson; }
}
