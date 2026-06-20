package com.genealogy.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.config.WebConfig;
import com.genealogy.server.model.AuditLog;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.RefreshTokenService;
import com.genealogy.server.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuditLogController.class,
            excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import(WebConfig.class)
@WithMockUser
public class AuditLogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuditLogRepository auditLogRepository;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    @MockBean
    private UserRepository userRepository;

    private AuditLog createAuditLog(Long id, String username, String action, String detail) {
        AuditLog log = new AuditLog();
        log.setId(id);
        log.setUsername(username);
        log.setAction(action);
        log.setDetail(detail);
        log.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30, 0));
        return log;
    }

    @Test
    public void testListLogs() throws Exception {
        when(userService.isAdmin("admin")).thenReturn(true);

        AuditLog log1 = createAuditLog(1L, "admin", "ADMIN_CREATE_USER", "创建用户「alice」");
        AuditLog log2 = createAuditLog(2L, "admin", "ADMIN_DELETE_USER", "删除用户 #3");
        Page<AuditLog> logPage = new PageImpl<>(List.of(log1, log2));

        when(auditLogRepository.findAllByOrderByCreatedAtDesc(any(Pageable.class)))
                .thenReturn(logPage);

        mockMvc.perform(get("/api/admin/logs")
                .requestAttr("currentUsername", "admin")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].username").value("admin"))
                .andExpect(jsonPath("$.data[0].action").value("ADMIN_CREATE_USER"))
                .andExpect(jsonPath("$.data[0].detail").value("创建用户「alice」"))
                .andExpect(jsonPath("$.data[1].id").value(2))
                .andExpect(jsonPath("$.data[1].action").value("ADMIN_DELETE_USER"));
    }

    @Test
    public void testListLogsWithPagination() throws Exception {
        when(userService.isAdmin("admin")).thenReturn(true);

        Page<AuditLog> logPage = new PageImpl<>(List.of());
        when(auditLogRepository.findAllByOrderByCreatedAtDesc(any(Pageable.class)))
                .thenReturn(logPage);

        mockMvc.perform(get("/api/admin/logs")
                .param("page", "1")
                .param("size", "20")
                .requestAttr("currentUsername", "admin")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    public void testAddLog() throws Exception {
        when(userService.isAdmin("admin")).thenReturn(true);
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(invocation -> {
            AuditLog log = invocation.getArgument(0);
            log.setId(1L);
            return log;
        });

        mockMvc.perform(post("/api/admin/logs")
                .requestAttr("currentUsername", "admin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                        Map.of("action", "MANUAL_NOTE", "detail", "手动添加备注")
                )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    public void testAddLogWithMissingFields() throws Exception {
        when(userService.isAdmin("admin")).thenReturn(true);
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/admin/logs")
                .requestAttr("currentUsername", "admin")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    public void testListLogsForbiddenForNonAdmin() throws Exception {
        when(userService.isAdmin("regularuser")).thenReturn(false);

        mockMvc.perform(get("/api/admin/logs")
                .requestAttr("currentUsername", "regularuser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
}
