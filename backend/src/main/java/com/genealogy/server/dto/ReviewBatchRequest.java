package com.genealogy.server.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ReviewBatchRequest(
        @NotEmpty(message = "请选择要操作的记录")
        @Size(max = 500, message = "最多同时操作 500 条记录")
        List<@NotNull(message = "审核记录 ID 不能为空") @Positive(message = "审核记录 ID 必须为正数") Long> ids,
        @NotNull(message = "审核操作不能为空")
        String action,
        @Size(max = 1000, message = "拒绝原因不能超过 1000 个字符")
        String reason) {
}
