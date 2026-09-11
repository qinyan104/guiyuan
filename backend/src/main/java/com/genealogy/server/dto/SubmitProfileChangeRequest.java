package com.genealogy.server.dto;

import jakarta.validation.constraints.Size;
import java.util.Map;

public record SubmitProfileChangeRequest(
        @Size(max = 100, message = "一次最多修改 100 个字段")
        Map<String, Object> changes) {
}
