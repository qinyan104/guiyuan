package com.genealogy.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.config.SecurityConfig;
import com.genealogy.server.config.WebConfig;
import com.genealogy.server.interceptor.AuthInterceptor;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PublicationAccessController.class)
@Import({WebConfig.class, SecurityConfig.class, PublicationAccessControllerTest.TestConfig.class})
class PublicationAccessControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PublicationAuthorizationService authorizationService;

    @MockBean
    private PublicationAccessRepository accessRepository;

    @MockBean
    private UserRepository userRepository;

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

        when(accessRepository.findByPublicationId(100L)).thenReturn(Collections.singletonList(access));
        when(userRepository.findById(1L)).thenReturn(Optional.of(currentUser));

        mockMvc.perform(get("/api/publications/100/access")
                .header("Authorization", "Bearer mock-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("OWNER"))
                .andExpect(jsonPath("$[0].username").value("testuser"));
    }

    @TestConfiguration
    static class TestConfig {
        @Bean
        AuthInterceptor authInterceptor(ObjectMapper objectMapper) {
            return new AuthInterceptor(new MockUserService(), objectMapper);
        }
    }

    static class MockUserService extends UserService {
        MockUserService() {
            super(null, null);
        }

        @Override
        public String validateToken(String token) {
            return "testuser";
        }
    }
}
