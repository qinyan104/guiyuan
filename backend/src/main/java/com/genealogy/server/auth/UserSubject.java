package com.genealogy.server.auth;

public class UserSubject implements AccessSubject {

    private final Long userId;
    private final String platformRole;
    private final String username;

    public UserSubject(Long userId, String platformRole, String username) {
        this.userId = userId;
        this.platformRole = platformRole;
        this.username = username;
    }

    @Override
    public SubjectType getType() { return SubjectType.USER; }

    @Override
    public Long getUserId() { return userId; }

    @Override
    public String getPlatformRole() { return platformRole; }

    @Override
    public Long getSharePublicationId() { return null; }

    public String getUsername() { return username; }
}
