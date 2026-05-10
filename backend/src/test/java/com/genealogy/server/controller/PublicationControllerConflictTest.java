package com.genealogy.server.controller;

import com.genealogy.server.config.WebConfig;
import com.genealogy.server.exception.ConflictException;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import com.genealogy.server.service.PublicationViewProjector;
import com.genealogy.server.service.RefreshTokenService;
import com.genealogy.server.service.ShareLinkService;
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

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PublicationController.class,
            excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                SecurityFilterAutoConfiguration.class,
                UserDetailsServiceAutoConfiguration.class
            })
@Import(WebConfig.class)
class PublicationControllerConflictTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PublicationService publicationService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private AuditLogRepository auditLogRepository;

    @MockBean
    private PublicationAuthorizationService authorizationService;

    @MockBean
    private ShareLinkService shareLinkService;

    @MockBean
    private PublicationViewProjector viewProjector;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

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
    void updateReturnsConflictWhenClientRevisionIsStale() throws Exception {
        doThrow(new ConflictException("Publication is stale. Reload before saving."))
            .when(publicationService)
            .updatePublication(eq(100L), eq(3L), any(), any(), any(), any(), any());

        mockMvc.perform(put("/api/publications/100")
                .requestAttr("currentUsername", "testuser")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "title": "Clan Book",
                      "subtitle": "",
                      "revision": 3,
                      "publication": { "focusFamilyId": "", "people": {}, "families": {} },
                      "settings": {},
                      "info": {}
                    }
                    """))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value(409));
    }
}
