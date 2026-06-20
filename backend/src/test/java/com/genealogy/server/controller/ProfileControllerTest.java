package com.genealogy.server.controller;

import com.genealogy.server.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "testuser")
public class ProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    // --- changePassword ---

    @Test
    public void testChangePasswordSuccess() throws Exception {
        doNothing().when(userService).changePassword("testuser", "OldPass1", "NewPass123");

        mockMvc.perform(put("/api/user/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"oldPassword\":\"OldPass1\",\"newPassword\":\"NewPass123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("密码修改成功"));

        verify(userService).changePassword("testuser", "OldPass1", "NewPass123");
    }

    @Test
    public void testChangePasswordBlankOldPassword() throws Exception {
        mockMvc.perform(put("/api/user/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"oldPassword\":\"\",\"newPassword\":\"NewPass123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("请输入当前密码"));
    }

    @Test
    public void testChangePasswordNullOldPassword() throws Exception {
        mockMvc.perform(put("/api/user/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"newPassword\":\"NewPass123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("请输入当前密码"));
    }

    @Test
    public void testChangePasswordTooShort() throws Exception {
        mockMvc.perform(put("/api/user/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"oldPassword\":\"OldPass1\",\"newPassword\":\"Short1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("新密码至少8个字符"));
    }

    @Test
    public void testChangePasswordMissingComplexity() throws Exception {
        mockMvc.perform(put("/api/user/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"oldPassword\":\"OldPass1\",\"newPassword\":\"newpass123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("新密码须包含大小写字母和数字"));
    }

    // --- changeNickname ---

    @Test
    public void testChangeNicknameSuccess() throws Exception {
        doNothing().when(userService).changeNickname("testuser", "新昵称");

        mockMvc.perform(put("/api/user/nickname")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nickname\":\"新昵称\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("昵称修改成功"));

        verify(userService).changeNickname("testuser", "新昵称");
    }

    @Test
    public void testChangeNicknameTrimsWhitespace() throws Exception {
        doNothing().when(userService).changeNickname("testuser", "新昵称");

        mockMvc.perform(put("/api/user/nickname")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nickname\":\"  新昵称  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(userService).changeNickname("testuser", "新昵称");
    }

    @Test
    public void testChangeNicknameBlank() throws Exception {
        mockMvc.perform(put("/api/user/nickname")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nickname\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("昵称不能为空"));
    }

    @Test
    public void testChangeNicknameNull() throws Exception {
        mockMvc.perform(put("/api/user/nickname")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("昵称不能为空"));
    }
}
