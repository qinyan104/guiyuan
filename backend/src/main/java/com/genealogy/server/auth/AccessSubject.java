package com.genealogy.server.auth;

public interface AccessSubject {
    enum SubjectType { USER, SHARE }

    SubjectType getType();
    Long getUserId();
    String getPlatformRole();
    Long getSharePublicationId();
}
