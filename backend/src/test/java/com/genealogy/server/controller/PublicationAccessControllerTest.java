package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PublicationAccessControllerTest {

    @Mock
    private PublicationAuthorizationService authorizationService;

    @Mock
    private PublicationAccessRepository accessRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PublicationService publicationService;

    private MockMvc mockMvc;
    private User currentUser;

    @BeforeEach
    void setUp() {
        PublicationAccessController controller = new PublicationAccessController(
                authorizationService,
                accessRepository,
                userRepository,
                publicationService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();

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
                        .requestAttr("currentUsername", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("OWNER"))
                .andExpect(jsonPath("$[0].username").value("testuser"));

        ArgumentCaptor<UserSubject> subjectCaptor = ArgumentCaptor.forClass(UserSubject.class);
        verify(authorizationService).require(subjectCaptor.capture(), eq(100L), eq(AccessPermission.MANAGE_ACCESS));
        assertThat(subjectCaptor.getValue().getUserId()).isEqualTo(1L);
        assertThat(subjectCaptor.getValue().getUsername()).isEqualTo("testuser");
    }

    @Test
    void mergeBranchShouldDelegateToPublicationService() throws Exception {
        mockMvc.perform(post("/api/publications/100/access/person-9/merge")
                        .requestAttr("currentUsername", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        ArgumentCaptor<UserSubject> authSubjectCaptor = ArgumentCaptor.forClass(UserSubject.class);
        ArgumentCaptor<UserSubject> mergeSubjectCaptor = ArgumentCaptor.forClass(UserSubject.class);
        verify(authorizationService).require(authSubjectCaptor.capture(), eq(100L), eq(AccessPermission.MANAGE_ACCESS));
        verify(publicationService).mergeBranch(eq(100L), eq("person-9"), mergeSubjectCaptor.capture());

        assertThat(authSubjectCaptor.getValue().getUserId()).isEqualTo(1L);
        assertThat(authSubjectCaptor.getValue().getUsername()).isEqualTo("testuser");
        assertThat(mergeSubjectCaptor.getValue().getUserId()).isEqualTo(1L);
        assertThat(mergeSubjectCaptor.getValue().getUsername()).isEqualTo("testuser");
    }
}
