package com.genealogy.server.controller;

import com.genealogy.server.config.WebConfig;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.AccountDerivationService;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.RefreshTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminAccountController.class,
            excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import(WebConfig.class)
@WithMockUser
public class AdminAccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AccountDerivationService accountDerivationService;

    @MockBean
    private PublicationAuthorizationService authorizationService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    private User adminUser;

    @BeforeEach
    void setUp() {
        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setUsername("admin");
        adminUser.setRole("SUPER_ADMIN");

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
    }

    // ---- derive ----

    @Test
    void deriveAccountsShouldReturnCreatedList() throws Exception {
        List<Map<String, Object>> created = List.of(
                Map.of("personDbId", 10L, "personName", "张三", "username", "zhangsan_1", "password", "Abc12345"),
                Map.of("personDbId", 11L, "personName", "李四", "username", "lisi_1", "password", "Def67890")
        );
        when(accountDerivationService.deriveAccounts(1L)).thenReturn(created);

        mockMvc.perform(post("/api/publications/1/accounts/derive")
                        .requestAttr("currentUsername", "admin")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("已派生 2 个账号"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].personName").value("张三"))
                .andExpect(jsonPath("$.data[1].personName").value("李四"));

        verify(accountDerivationService).deriveAccounts(1L);
    }

    @Test
    void deriveAccountsShouldReturnEmptyWhenNoneCreated() throws Exception {
        when(accountDerivationService.deriveAccounts(1L)).thenReturn(List.of());

        mockMvc.perform(post("/api/publications/1/accounts/derive")
                        .requestAttr("currentUsername", "admin")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("已派生 0 个账号"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    // ---- list ----

    @Test
    void listAccountsShouldReturnList() throws Exception {
        Map<String, Object> account1 = new LinkedHashMap<>();
        account1.put("personDbId", 10L);
        account1.put("personName", "张三");
        account1.put("gender", "male");
        account1.put("deceased", false);
        account1.put("accountStatus", "active");
        account1.put("username", "zhangsan_1");

        Map<String, Object> account2 = new LinkedHashMap<>();
        account2.put("personDbId", 11L);
        account2.put("personName", "李四");
        account2.put("gender", "female");
        account2.put("deceased", true);
        account2.put("accountStatus", null);
        account2.put("username", null);

        List<Map<String, Object>> accounts = List.of(account1, account2);
        when(accountDerivationService.listAccounts(1L)).thenReturn(accounts);

        mockMvc.perform(get("/api/publications/1/accounts")
                        .requestAttr("currentUsername", "admin")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].personName").value("张三"))
                .andExpect(jsonPath("$.data[0].accountStatus").value("active"))
                .andExpect(jsonPath("$.data[0].username").value("zhangsan_1"))
                .andExpect(jsonPath("$.data[1].personName").value("李四"))
                .andExpect(jsonPath("$.data[1].deceased").value(true));

        verify(accountDerivationService).listAccounts(1L);
    }

    // ---- disable ----

    @Test
    void disableAccountShouldCallService() throws Exception {
        doNothing().when(accountDerivationService).disableAccount(10L);

        mockMvc.perform(put("/api/publications/1/accounts/10/disable")
                        .requestAttr("currentUsername", "admin")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("账号已停用"));

        verify(accountDerivationService).disableAccount(10L);
    }

    // ---- enable ----

    @Test
    void enableAccountShouldCallService() throws Exception {
        doNothing().when(accountDerivationService).enableAccount(10L);

        mockMvc.perform(put("/api/publications/1/accounts/10/enable")
                        .requestAttr("currentUsername", "admin")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("账号已启用"));

        verify(accountDerivationService).enableAccount(10L);
    }

    // ---- resetPassword ----

    @Test
    void resetPasswordShouldReturnNewPassword() throws Exception {
        when(accountDerivationService.resetPassword(10L)).thenReturn("NewPass123");

        mockMvc.perform(post("/api/publications/1/accounts/10/reset-password")
                        .requestAttr("currentUsername", "admin")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("密码已重置"))
                .andExpect(jsonPath("$.data.newPassword").value("NewPass123"));

        verify(accountDerivationService).resetPassword(10L);
    }

    // ---- deleteAccount ----

    @Test
    void deleteAccountShouldCallService() throws Exception {
        doNothing().when(accountDerivationService).deleteAccount(1L, 10L);

        mockMvc.perform(delete("/api/publications/1/accounts/10")
                        .requestAttr("currentUsername", "admin")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("账号记录已删除"));

        verify(accountDerivationService).deleteAccount(1L, 10L);
    }

    // ---- batchDeleteAccounts ----

    @Test
    void batchDeleteAccountsShouldReturnDeletedCount() throws Exception {
        doNothing().when(accountDerivationService).deleteAccount(eq(1L), anyLong());

        mockMvc.perform(post("/api/publications/1/accounts/batch-delete")
                        .requestAttr("currentUsername", "admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"personDbIds\":[10,11,12]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.deleted").value(3));

        verify(accountDerivationService).deleteAccount(1L, 10L);
        verify(accountDerivationService).deleteAccount(1L, 11L);
        verify(accountDerivationService).deleteAccount(1L, 12L);
    }

    @Test
    void batchDeleteAccountsWithEmptyIdsShouldReturnZero() throws Exception {
        mockMvc.perform(post("/api/publications/1/accounts/batch-delete")
                        .requestAttr("currentUsername", "admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"personDbIds\":[]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.deleted").value(0));

        verify(accountDerivationService, never()).deleteAccount(anyLong(), anyLong());
    }

    @Test
    void batchDeleteAccountsWithMissingIdsShouldReturnZero() throws Exception {
        mockMvc.perform(post("/api/publications/1/accounts/batch-delete")
                        .requestAttr("currentUsername", "admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.deleted").value(0));

        verify(accountDerivationService, never()).deleteAccount(anyLong(), anyLong());
    }

    // ---- cleanupOrphans ----

    @Test
    void cleanupOrphansShouldReturnCleanedCount() throws Exception {
        when(accountDerivationService.cleanupOrphanedAccounts(1L)).thenReturn(2);

        mockMvc.perform(delete("/api/publications/1/accounts/orphans")
                        .requestAttr("currentUsername", "admin")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("已清理 2 个空悬账号"))
                .andExpect(jsonPath("$.data.cleaned").value(2));

        verify(accountDerivationService).cleanupOrphanedAccounts(1L);
    }

    // ---- authorization tests ----

    @Test
    void nonSuperAdminShouldRequireManageAccess() throws Exception {
        User normalUser = new User();
        normalUser.setId(2L);
        normalUser.setUsername("normaluser");
        normalUser.setRole("USER");
        when(userRepository.findByUsername("normaluser")).thenReturn(Optional.of(normalUser));
        doNothing().when(authorizationService).require(any(), eq(1L), any());

        when(accountDerivationService.listAccounts(1L)).thenReturn(List.of());

        mockMvc.perform(get("/api/publications/1/accounts")
                        .requestAttr("currentUsername", "normaluser")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(authorizationService).require(any(), eq(1L), any());
        verify(accountDerivationService).listAccounts(1L);
    }

    @Test
    void missingUsernameShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/publications/1/accounts")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.message").value("未登录"));
    }

    @Test
    void unknownUsernameShouldReturn403() throws Exception {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/publications/1/accounts")
                        .requestAttr("currentUsername", "ghost")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.message").value("未登录"));
    }
}
