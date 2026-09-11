package com.genealogy.server.dto;

import jakarta.validation.constraints.Size;

public record ChangeNicknameRequest(
        @Size(max = 100, message = "昵称不能超过 100 个字符") String nickname) {
}
