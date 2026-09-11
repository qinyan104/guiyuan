package com.genealogy.server.dto;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record BatchDeleteUsersRequest(
        @Size(max = 500, message = "最多同时删除 500 个用户")
        List<@Positive(message = "用户 ID 必须为正数") Long> ids) {}
