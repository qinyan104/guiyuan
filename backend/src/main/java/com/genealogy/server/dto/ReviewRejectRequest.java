package com.genealogy.server.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewRejectRequest(
        @NotBlank(message = "拒绝原因不能为空")
        @Size(max = 1000, message = "拒绝原因不能超过 1000 个字符")
        String reason) {
}
