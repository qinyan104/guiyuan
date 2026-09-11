package com.genealogy.server.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record AddAccessRequest(
        @NotNull(message = "用户 ID 不能为空") @Positive(message = "用户 ID 必须为正数") Long userId,
        @NotNull(message = "角色不能为空") @Size(max = 20, message = "角色格式无效") String role,
        @Size(max = 10000, message = "脱敏配置不能超过 10000 个字符") String redactionProfile) {
}
