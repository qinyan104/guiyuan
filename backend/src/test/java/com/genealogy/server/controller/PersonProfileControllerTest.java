package com.genealogy.server.controller;

import com.genealogy.server.config.WebConfig;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.ProfileService;
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
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PersonProfileController.class,
            excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import(WebConfig.class)
@WithMockUser
public class PersonProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProfileService profileService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setRole("USER");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
    }

    // ---- getMyProfile ----

    @Test
    void getMyProfileShouldReturnProfileData() throws Exception {
        Map<String, Object> person = new LinkedHashMap<>();
        person.put("name", "张三");
        person.put("gender", "male");
        person.put("birth", "1990-01-01");
        person.put("death", null);
        person.put("deceased", false);
        person.put("note", "长子");

        Map<String, Object> publication = new LinkedHashMap<>();
        publication.put("id", 1L);
        publication.put("title", "张氏族谱");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("person", person);
        result.put("publication", publication);
        result.put("hasPendingChanges", false);
        result.put("personDbId", 10L);

        when(profileService.getMyProfile(1L)).thenReturn(result);

        mockMvc.perform(get("/api/profile/me")
                        .requestAttr("currentUsername", "testuser")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.person.name").value("张三"))
                .andExpect(jsonPath("$.data.person.gender").value("male"))
                .andExpect(jsonPath("$.data.person.birth").value("1990-01-01"))
                .andExpect(jsonPath("$.data.person.deceased").value(false))
                .andExpect(jsonPath("$.data.person.note").value("长子"))
                .andExpect(jsonPath("$.data.publication.id").value(1))
                .andExpect(jsonPath("$.data.publication.title").value("张氏族谱"))
                .andExpect(jsonPath("$.data.hasPendingChanges").value(false))
                .andExpect(jsonPath("$.data.personDbId").value(10));

        verify(profileService).getMyProfile(1L);
    }

    @Test
    void getMyProfileShouldIncludeAvatarUrlWhenPhotoExists() throws Exception {
        Map<String, Object> person = new LinkedHashMap<>();
        person.put("name", "李四");
        person.put("avatarUrl", "/api/photos/42");

        Map<String, Object> publication = new LinkedHashMap<>();
        publication.put("id", 2L);
        publication.put("title", "李氏族谱");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("person", person);
        result.put("publication", publication);
        result.put("hasPendingChanges", true);
        result.put("personDbId", 20L);

        when(profileService.getMyProfile(1L)).thenReturn(result);

        mockMvc.perform(get("/api/profile/me")
                        .requestAttr("currentUsername", "testuser")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.person.avatarUrl").value("/api/photos/42"))
                .andExpect(jsonPath("$.data.hasPendingChanges").value(true));
    }

    // ---- submitChange ----

    @Test
    void submitChangeShouldCallServiceWithChanges() throws Exception {
        doNothing().when(profileService).submitProfileChange(eq(1L), any());

        mockMvc.perform(put("/api/profile/me")
                        .requestAttr("currentUsername", "testuser")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"changes\":{\"name\":\"李四\",\"birth\":\"1995-06-15\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("修改已提交，等待管理员审核"));

        verify(profileService).submitProfileChange(eq(1L), any());
    }

    @Test
    void submitChangeWithEmptyChangesShouldReturnSuccessWithoutCallingService() throws Exception {
        mockMvc.perform(put("/api/profile/me")
                        .requestAttr("currentUsername", "testuser")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"changes\":{}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("没有需要提交的修改"));

        verify(profileService, never()).submitProfileChange(eq(1L), any());
    }

    @Test
    void submitChangeWithNullChangesShouldReturnSuccessWithoutCallingService() throws Exception {
        mockMvc.perform(put("/api/profile/me")
                        .requestAttr("currentUsername", "testuser")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("没有需要提交的修改"));

        verify(profileService, never()).submitProfileChange(eq(1L), any());
    }

    // ---- error cases ----

    @Test
    void missingUsernameShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/profile/me")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.message").value("未登录"));
    }

    @Test
    void unknownUsernameShouldReturn403() throws Exception {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/profile/me")
                        .requestAttr("currentUsername", "ghost")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.message").value("未登录"));
    }
}
