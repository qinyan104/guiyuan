package com.genealogy.server.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WechatLoginRequest(
        @NotBlank(message = "缺少微信登录 code")
        @Size(max = 512, message = "微信登录 code 长度无效")
        String code) {
}
