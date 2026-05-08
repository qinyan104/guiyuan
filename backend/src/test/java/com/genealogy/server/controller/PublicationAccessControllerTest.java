package com.genealogy.server.controller;

import com.genealogy.server.config.WebConfig;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.PublicationAuthorizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
    }
}
