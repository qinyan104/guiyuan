package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.ShareSubject;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.config.WebConfig;
import com.genealogy.server.model.PublicationShareLink;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.AuditLogService;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import com.genealogy.server.service.PublicationViewProjector;
import com.genealogy.server.service.RefreshTokenService;
import com.genealogy.server.service.ShareLinkService;
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

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = MobileController.class,
        excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import(WebConfig.class)
@WithMockUser
class MobileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private PublicationService publicationService;

    @MockBean
    private AuditLogService auditLogService;

    @MockBean
    private PublicationAuthorizationService authorizationService;

    @MockBean
    private ShareLinkService shareLinkService;

    @MockBean
    private PublicationViewProjector viewProjector;

    @Test
    void shareSearchShouldReturnRedactedLivingPerson() throws Exception {
        PublicationShareLink shareLink = shareLink(10L, "{\"dates\":\"LIVING\",\"note\":\"LIVING\"}");
        when(shareLinkService.validateToken("share-123")).thenReturn(shareLink);
        when(authorizationService.can(any(ShareSubject.class), eq(10L), eq(AccessPermission.READ_FULL))).thenReturn(false);
        when(authorizationService.can(any(ShareSubject.class), eq(10L), eq(AccessPermission.READ_REDACTED))).thenReturn(true);

        Map<String, Object> fullData = publicationData(
                person("p1", "张三", false, "2000-01-01", null, "24", "secret note"),
                person("p2", "李四", true, "1900-01-01", "1980-01-01", null, "public note")
        );
        Map<String, Object> redactedData = publicationData(
                person("p1", "张三", false, null, null, null, null),
                person("p2", "李四", true, "1900-01-01", "1980-01-01", null, "public note")
        );
        when(publicationService.loadPublication(10L)).thenReturn(fullData);
        when(viewProjector.projectRedacted(eq(fullData), any(ShareSubject.class), eq("share-123")))
                .thenReturn(redactedData);

        mockMvc.perform(get("/api/mobile/publications/10/search")
                        .param("q", "张")
                        .param("shareToken", "share-123")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].name").value("张三"))
                .andExpect(jsonPath("$.data[0].birth").isEmpty())
                .andExpect(jsonPath("$.data[0].death").isEmpty())
                .andExpect(jsonPath("$.data[0].age").isEmpty())
                .andExpect(jsonPath("$.data[0].note").isEmpty());
    }

    @Test
    void shareSearchShouldKeepDefaultAllowedDeceasedFields() throws Exception {
        PublicationShareLink shareLink = shareLink(10L, null);
        when(shareLinkService.validateToken("share-123")).thenReturn(shareLink);
        when(authorizationService.can(any(ShareSubject.class), eq(10L), eq(AccessPermission.READ_FULL))).thenReturn(false);
        when(authorizationService.can(any(ShareSubject.class), eq(10L), eq(AccessPermission.READ_REDACTED))).thenReturn(true);

        Map<String, Object> fullData = publicationData(
                person("p1", "张三", false, "2000-01-01", null, "24", "secret note"),
                person("p2", "李四", true, "1900-01-01", "1980-01-01", null, "public note")
        );
        Map<String, Object> redactedData = publicationData(
                person("p1", "张三", false, null, null, null, null),
                person("p2", "李四", true, "1900-01-01", "1980-01-01", null, "public note")
        );
        when(publicationService.loadPublication(10L)).thenReturn(fullData);
        when(viewProjector.projectRedacted(eq(fullData), any(ShareSubject.class), eq("share-123")))
                .thenReturn(redactedData);

        mockMvc.perform(get("/api/mobile/publications/10/search")
                        .param("q", "李")
                        .param("shareToken", "share-123")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("李四"))
                .andExpect(jsonPath("$.data[0].birth").value("1900-01-01"))
                .andExpect(jsonPath("$.data[0].death").value("1980-01-01"))
                .andExpect(jsonPath("$.data[0].note").value("public note"));
    }

    @Test
    void shareSearchShouldRejectPublicationMismatch() throws Exception {
        PublicationShareLink shareLink = shareLink(10L, null);
        when(shareLinkService.validateToken("share-123")).thenReturn(shareLink);
        when(authorizationService.can(any(ShareSubject.class), eq(999L), eq(AccessPermission.READ_FULL))).thenReturn(false);
        when(authorizationService.can(any(ShareSubject.class), eq(999L), eq(AccessPermission.READ_REDACTED))).thenReturn(false);

        mockMvc.perform(get("/api/mobile/publications/999/search")
                        .param("q", "张")
                        .param("shareToken", "share-123")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));
    }

    @Test
    void blankQueryShouldReturnEmptyArrayAfterShareRedactionWithoutLeakingPeople() throws Exception {
        PublicationShareLink shareLink = shareLink(10L, null);
        when(shareLinkService.validateToken("share-123")).thenReturn(shareLink);
        when(authorizationService.can(any(ShareSubject.class), eq(10L), eq(AccessPermission.READ_FULL))).thenReturn(false);
        when(authorizationService.can(any(ShareSubject.class), eq(10L), eq(AccessPermission.READ_REDACTED))).thenReturn(true);

        Map<String, Object> fullData = publicationData(person("p1", "张三", false, "2000-01-01", null, "24", "secret note"));
        Map<String, Object> redactedData = publicationData(person("p1", "张三", false, null, null, null, null));
        when(publicationService.loadPublication(10L)).thenReturn(fullData);
        when(viewProjector.projectRedacted(eq(fullData), any(ShareSubject.class), eq("share-123")))
                .thenReturn(redactedData);

        mockMvc.perform(get("/api/mobile/publications/10/search")
                        .param("q", "   ")
                        .param("shareToken", "share-123")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    void loggedInSearchShouldKeepFullDataAndSkipShareRedaction() throws Exception {
        User user = new User();
        user.setId(7L);
        user.setUsername("alice");
        user.setRole("USER");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(authorizationService.can(any(UserSubject.class), eq(10L), eq(AccessPermission.READ_FULL))).thenReturn(true);

        Map<String, Object> fullData = publicationData(person("p1", "张三", false, "2000-01-01", null, "24", "secret note"));
        when(publicationService.loadPublication(10L)).thenReturn(fullData);

        mockMvc.perform(get("/api/mobile/publications/10/search")
                        .requestAttr("currentUsername", "alice")
                        .param("q", "张")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("张三"))
                .andExpect(jsonPath("$.data[0].birth").value("2000-01-01"))
                .andExpect(jsonPath("$.data[0].age").value("24"))
                .andExpect(jsonPath("$.data[0].note").value("secret note"));

        verify(viewProjector, never()).projectRedacted(any(), any(ShareSubject.class), any());
    }

    private PublicationShareLink shareLink(Long publicationId, String redactionProfileJson) {
        PublicationShareLink shareLink = new PublicationShareLink();
        shareLink.setId(1L);
        shareLink.setPublicationId(publicationId);
        shareLink.setAllowExport(false);
        shareLink.setRedactionProfileJson(redactionProfileJson);
        return shareLink;
    }

    @SafeVarargs
    private final Map<String, Object> publicationData(Map<String, Object>... persons) {
        Map<String, Object> people = new LinkedHashMap<>();
        for (Map<String, Object> person : persons) {
            people.put((String) person.get("id"), person);
        }
        Map<String, Object> publication = new LinkedHashMap<>();
        publication.put("people", people);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("publication", publication);
        return data;
    }

    private Map<String, Object> person(String id, String name, boolean deceased, String birth, String death, String age, String note) {
        Map<String, Object> person = new LinkedHashMap<>();
        person.put("id", id);
        person.put("name", name);
        person.put("deceased", deceased);
        person.put("birth", birth);
        person.put("death", death);
        person.put("age", age);
        person.put("note", note);
        return person;
    }
}
