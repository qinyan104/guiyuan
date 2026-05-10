package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.config.WebConfig;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import com.genealogy.server.service.RefreshTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isA;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PublicationAccessController.class,
            excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                SecurityFilterAutoConfiguration.class,
                UserDetailsServiceAutoConfiguration.class
            })
@Import(WebConfig.class)
class PublicationAccessControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PublicationAuthorizationService authorizationService;

    @MockBean
    private PublicationAccessRepository accessRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private AuditLogRepository auditLogRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    @MockBean
    private PublicationService publicationService;

    private User currentUser;

    @BeforeEach
    void setUp() {
        currentUser = new User();
        currentUser.setId(1L);
        currentUser.setUsername("testuser");
        currentUser.setRole("USER");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(currentUser));
    }

    @Test
    void listAccessShouldReturnRecords() throws Exception {
        PublicationAccess access = new PublicationAccess();
        access.setId(1L);
        access.setUserId(1L);
        access.setRole("OWNER");
        access.setPublicationId(100L);

        doNothing().when(authorizationService).require(any(), anyLong(), any());
        when(accessRepository.findByPublicationId(100L)).thenReturn(Collections.singletonList(access));
        when(userRepository.findById(1L)).thenReturn(Optional.of(currentUser));

        mockMvc.perform(get("/api/publications/100/access")
                .requestAttr("currentUsername", "testuser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].role").value("OWNER"))
                .andExpect(jsonPath("$.data[0].username").value("testuser"));

        ArgumentCaptor<UserSubject> subjectCaptor = ArgumentCaptor.forClass(UserSubject.class);
        verify(authorizationService).require(subjectCaptor.capture(), eq(100L), eq(AccessPermission.MANAGE_ACCESS));
        assertThat(subjectCaptor.getValue().getUserId()).isEqualTo(1L);
        assertThat(subjectCaptor.getValue().getUsername()).isEqualTo("testuser");
    }

    @Test
    void mergeBranchShouldDelegateToPublicationService() throws Exception {
        mockMvc.perform(post("/api/publications/100/access/person-9/merge")
                        .requestAttr("currentUsername", "testuser")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("分支已合并"));

        ArgumentCaptor<UserSubject> authSubjectCaptor = ArgumentCaptor.forClass(UserSubject.class);
        ArgumentCaptor<UserSubject> mergeSubjectCaptor = ArgumentCaptor.forClass(UserSubject.class);
        verify(authorizationService).require(authSubjectCaptor.capture(), eq(100L), eq(AccessPermission.MANAGE_ACCESS));
        verify(publicationService).mergeBranch(eq(100L), eq("person-9"), mergeSubjectCaptor.capture());

        assertThat(authSubjectCaptor.getValue().getUserId()).isEqualTo(1L);
        assertThat(authSubjectCaptor.getValue().getUsername()).isEqualTo("testuser");
        assertThat(mergeSubjectCaptor.getValue().getUserId()).isEqualTo(1L);
        assertThat(mergeSubjectCaptor.getValue().getUsername()).isEqualTo("testuser");
    }

    @Test
    void mergeBranchStillRequiresManageAccess() throws Exception {
        mockMvc.perform(post("/api/publications/100/access/person-9/merge")
                        .requestAttr("currentUsername", "testuser")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(authorizationService).require(isA(UserSubject.class), eq(100L), eq(AccessPermission.MANAGE_ACCESS));
    }
}
