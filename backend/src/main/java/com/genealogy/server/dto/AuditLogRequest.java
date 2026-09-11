package com.genealogy.server.dto;

import jakarta.validation.constraints.Size;

public record AuditLogRequest(
        @Size(max = 100, message = "操作名称不能超过 100 个字符") String action,
        @Size(max = 5000, message = "日志详情不能超过 5000 个字符") String detail) {
}
