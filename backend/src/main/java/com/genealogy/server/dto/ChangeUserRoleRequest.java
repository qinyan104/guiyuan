package com.genealogy.server.dto;

import jakarta.validation.constraints.Size;

public record ChangeUserRoleRequest(@Size(max = 30, message = "角色名称不能超过 30 个字符") String role) {}
