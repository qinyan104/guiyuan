package com.genealogy.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.config.WebConfig;
import com.genealogy.server.dto.ConsistencyReport;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.AuditLogService;
import com.genealogy.server.service.BackupService;
import com.genealogy.server.service.ConsistencyService;
import com.genealogy.server.service.RefreshTokenService;
import com.genealogy.server.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminController.class,
            excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import(WebConfig.class)
@WithMockUser
public class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @MockBean
    private AuditLogService auditLogService;

    @MockBean
    private BackupService backupService;

    @MockBean
    private ConsistencyService consistencyService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    @MockBean
    private UserRepository userRepository;

    @Test
    public void testListUsers() throws Exception {
        User user1 = new User();
        user1.setId(1L);
        user1.setUsername("alice");
        user1.setNickname("Alice");
        user1.setRole("ADMIN");

        User user2 = new User();
        user2.setId(2L);
        user2.setUsername("bob");
        user2.setNickname("Bob");
        user2.setRole("USER");

        when(userService.listAllUsers()).thenReturn(List.of(user1, user2));

        mockMvc.perform(get("/api/admin/users")
                .requestAttr("currentUsername", "admin")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].username").value("alice"))
                .andExpect(jsonPath("$.data[0].nickname").value("Alice"))
                .andExpect(jsonPath("$.data[0].role").value("ADMIN"))
                .andExpect(jsonPath("$.data[1].id").value(2))
                .andExpect(jsonPath("$.data[1].username").value("bob"))
                .andExpect(jsonPath("$.data[1].nickname").value("Bob"))
                .andExpect(jsonPath("$.data[1].role").value("USER"));
    }

    @Test
    public void testCreateUser() throws Exception {
        User createdUser = new User();
        createdUser.setId(3L);
        createdUser.setUsername("newuser");
        createdUser.setNickname("New User");
        createdUser.setRole("USER");

        when(userService.createUser("newuser", "pass123", "New User", "USER"))
                .thenReturn(createdUser);
        doNothing().when(auditLogService).record(anyString(), anyString(), anyString(), any(), any());

        mockMvc.perform(post("/api/admin/users")
                .requestAttr("currentUsername", "admin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                        new java.util.LinkedHashMap<>() {{
                            put("username", "newuser");
                            put("password", "pass123");
                            put("nickname", "New User");
                        }}
                )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.id").value(3))
                .andExpect(jsonPath("$.data.username").value("newuser"))
                .andExpect(jsonPath("$.data.nickname").value("New User"));

        verify(auditLogService).record(eq("admin"), eq("ADMIN_CREATE_USER"), contains("newuser"), eq("user"), eq(3L));
    }

    @Test
    public void testDeleteUser() throws Exception {
        User targetUser = new User();
        targetUser.setId(1L);
        targetUser.setUsername("alice");

        when(userService.findById(1L)).thenReturn(Optional.of(targetUser));
        doNothing().when(userService).deleteUser(1L);
        doNothing().when(auditLogService).record(anyString(), anyString(), anyString(), any(), any());

        mockMvc.perform(delete("/api/admin/users/1")
                .requestAttr("currentUsername", "admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(userService).deleteUser(1L);
        verify(auditLogService).record(eq("admin"), eq("ADMIN_DELETE_USER"), contains("alice"), eq("user"), eq(1L));
    }

    @Test
    public void testResetPassword() throws Exception {
        doNothing().when(userService).resetPassword(1L, "new123");
        doNothing().when(auditLogService).record(anyString(), anyString(), anyString(), any(), any());

        mockMvc.perform(put("/api/admin/users/1/password")
                .requestAttr("currentUsername", "admin")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"newPassword\":\"new123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(userService).resetPassword(1L, "new123");
        verify(auditLogService).record(eq("admin"), eq("ADMIN_RESET_PASSWORD"), contains("1"), eq("user"), eq(1L));
    }

    @Test
    public void testChangeRole() throws Exception {
        doNothing().when(userService).changeUserRole(1L, "ADMIN");
        doNothing().when(auditLogService).record(anyString(), anyString(), anyString(), any(), any());

        mockMvc.perform(put("/api/admin/users/1/role")
                .requestAttr("currentUsername", "admin")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(userService).changeUserRole(1L, "ADMIN");
        verify(auditLogService).record(eq("admin"), eq("ADMIN_CHANGE_ROLE"), contains("ADMIN"), eq("user"), eq(1L));
    }

    @Test
    public void testCheckConsistency() throws Exception {
        ConsistencyReport report = new ConsistencyReport();
        report.setTotalIssues(0);

        when(consistencyService.runCheck()).thenReturn(report);

        mockMvc.perform(get("/api/admin/check-consistency")
                .requestAttr("currentUsername", "admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.totalIssues").value(0));
    }
}
