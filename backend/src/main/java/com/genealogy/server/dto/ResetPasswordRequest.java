package com.genealogy.server.dto;

import com.genealogy.server.security.ValidPassword;
import jakarta.validation.constraints.NotBlank;

public class ResetPasswordRequest {
    @NotBlank(message = "新密码不能为空")
    @ValidPassword
    private String newPassword;

    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}
