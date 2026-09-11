package com.genealogy.server.dto;

import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        String oldPassword,
        @Size(max = 200, message = "新密码长度不能超过 200 个字符") String newPassword) {
}
