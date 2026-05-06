package com.genealogy.server.auth;

public enum AccessPermission {
    READ_FULL,
    READ_REDACTED,
    EDIT,
    DELETE,
    HISTORY_READ,
    EXPORT_FULL,
    EXPORT_REDACTED,
    MANAGE_ACCESS,
    MANAGE_SHARES
}
