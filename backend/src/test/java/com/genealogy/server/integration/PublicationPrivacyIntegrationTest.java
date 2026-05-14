package com.genealogy.server.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
public class PublicationPrivacyIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PublicationService publicationService;

    @MockBean
    private PublicationAuthorizationService authorizationService;

    @MockBean
    private UserRepository userRepository;

    private Map<String, Object> testData;
    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setRole("USER");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        testData = new HashMap<>();
        Map<String, Object> publication = new HashMap<>();
        Map<String, Object> people = new HashMap<>();
        
        Map<String, Object> living = new HashMap<>();
        living.put("id", "p1");
        living.put("name", "Living");
        living.put("deceased", false);
        living.put("birth", "2000-01-01");
        people.put("p1", living);
        
        publication.put("people", people);
        testData.put("publication", publication);

        when(publicationService.loadPublication(1L)).thenReturn(testData);
    }

    @Test
    void testGetPublicationAsOwner_SeesAll() throws Exception {
        PublicationAccess access = new PublicationAccess();
        access.setRole("OWNER");
        
        when(authorizationService.getAccess(anyLong(), eq(1L))).thenReturn(Optional.of(access));

        mockMvc.perform(get("/api/publications/1")
                .requestAttr("currentUsername", "testuser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.publication.people.p1.birth", is("2000-01-01")));
    }

    @Test
    void testGetPublicationAsViewer_Redacted() throws Exception {
        PublicationAccess access = new PublicationAccess();
        access.setRole("VIEWER");
        access.setRedactionProfile("{\"dates\":\"LIVING\"}");
        
        when(authorizationService.getAccess(anyLong(), eq(1L))).thenReturn(Optional.of(access));

        mockMvc.perform(get("/api/publications/1")
                .requestAttr("currentUsername", "testuser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.publication.people.p1.birth", nullValue()));
    }
}
