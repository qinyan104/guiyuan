package com.genealogy.server.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record BatchDeleteAccountsRequest(
        @Size(max = 500, message = "最多同时删除 500 个账号")
        List<@NotNull(message = "人物 ID 不能为空") @Positive(message = "人物 ID 必须为正数") Long> personDbIds) {
}
