package com.genealogy.server.controller;

import com.genealogy.server.auth.ShareSubject;
import com.genealogy.server.config.WebConfig;
import com.genealogy.server.interceptor.ShareTokenResolver;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.Photo;
import com.genealogy.server.model.Publication;
import com.genealogy.server.model.PublicationShareLink;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PhotoRepository;
import com.genealogy.server.repository.PublicationRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import com.genealogy.server.service.PublicationViewProjector;
import com.genealogy.server.service.RefreshTokenService;
import com.genealogy.server.service.ShareLinkService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SharePublicationController.class,
            excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import(WebConfig.class)
@WithMockUser
public class SharePublicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ShareTokenResolver shareTokenResolver;

    @MockBean
    private ShareLinkService shareLinkService;

    @MockBean
    private PublicationService publicationService;

    @MockBean
    private PublicationViewProjector viewProjector;

    @MockBean
    private PublicationAuthorizationService authorizationService;

    @MockBean
    private PhotoRepository photoRepository;

    @MockBean
    private PersonRepository personRepository;

    @MockBean
    private PublicationRepository publicationRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    @MockBean
    private UserRepository userRepository;

    // --- getPublication ---

    @Test
    public void testGetPublication() throws Exception {
        ShareSubject subject = new ShareSubject(1L, 10L, false, null);
        when(shareTokenResolver.resolveSubject("token123")).thenReturn(subject);

        Map<String, Object> fullData = new LinkedHashMap<>();
        fullData.put("publicationId", 10L);
        fullData.put("title", "王氏族谱");
        fullData.put("persons", List.of());
        when(publicationService.loadPublication(10L)).thenReturn(fullData);

        Map<String, Object> redacted = new LinkedHashMap<>();
        redacted.put("publicationId", 10L);
        redacted.put("title", "王氏族谱");
        when(viewProjector.projectRedacted(eq(fullData), eq(subject), eq("token123")))
                .thenReturn(redacted);

        mockMvc.perform(get("/api/shares/token123")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.publicationId").value(10))
                .andExpect(jsonPath("$.data.title").value("王氏族谱"));
    }

    // --- getMeta ---

    @Test
    public void testGetMeta() throws Exception {
        ShareSubject subject = new ShareSubject(1L, 10L, true, null);
        when(shareTokenResolver.resolveSubject("token123")).thenReturn(subject);

        PublicationShareLink link = new PublicationShareLink();
        link.setId(1L);
        link.setPublicationId(10L);
        link.setAllowExport(true);
        LocalDateTime expiresAt = LocalDateTime.of(2025, 12, 31, 23, 59, 59);
        LocalDateTime createdAt = LocalDateTime.of(2025, 1, 1, 0, 0, 0);
        link.setExpiresAt(expiresAt);
        link.setCreatedAt(createdAt);
        when(shareLinkService.validateToken("token123")).thenReturn(link);

        Publication publication = new Publication();
        publication.setId(10L);
        publication.setTitle("王氏族谱");
        publication.setSubtitle("太原堂");
        when(publicationRepository.findById(10L)).thenReturn(Optional.of(publication));

        mockMvc.perform(get("/api/shares/token123/meta")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.publicationId").value(10))
                .andExpect(jsonPath("$.data.allowExport").value(true))
                .andExpect(jsonPath("$.data.title").value("王氏族谱"))
                .andExpect(jsonPath("$.data.subtitle").value("太原堂"))
                .andExpect(jsonPath("$.data.expiresAt").value(expiresAt.toString()))
                .andExpect(jsonPath("$.data.createdAt").value(createdAt.toString()));
    }

    @Test
    public void testGetMetaWithoutPublication() throws Exception {
        ShareSubject subject = new ShareSubject(1L, 10L, false, null);
        when(shareTokenResolver.resolveSubject("token123")).thenReturn(subject);

        PublicationShareLink link = new PublicationShareLink();
        link.setId(1L);
        link.setPublicationId(10L);
        link.setAllowExport(false);
        link.setExpiresAt(null);
        link.setCreatedAt(null);
        when(shareLinkService.validateToken("token123")).thenReturn(link);

        when(publicationRepository.findById(10L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/shares/token123/meta")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.publicationId").value(10))
                .andExpect(jsonPath("$.data.allowExport").value(false))
                .andExpect(jsonPath("$.data.expiresAt").isEmpty())
                .andExpect(jsonPath("$.data.createdAt").isEmpty());
    }

    // --- getPhoto ---

    @Test
    public void testGetPhoto() throws Exception {
        ShareSubject subject = new ShareSubject(1L, 10L, false, null);
        when(shareTokenResolver.resolveSubject("token123")).thenReturn(subject);

        Photo photo = new Photo();
        photo.setId(100L);
        photo.setPersonDbId(5L);
        photo.setMimeType("image/jpeg");
        photo.setData(new byte[]{1, 2, 3});
        when(photoRepository.findById(100L)).thenReturn(Optional.of(photo));

        Person person = new Person();
        person.setId(5L);
        person.setPublicationId(10L);
        when(personRepository.findById(5L)).thenReturn(Optional.of(person));

        mockMvc.perform(get("/api/shares/token123/photos/100")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/jpeg"))
                .andExpect(content().bytes(new byte[]{1, 2, 3}));
    }

    @Test
    public void testGetPhotoNotFound() throws Exception {
        ShareSubject subject = new ShareSubject(1L, 10L, false, null);
        when(shareTokenResolver.resolveSubject("token123")).thenReturn(subject);

        when(photoRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/shares/token123/photos/999")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testGetPhotoForbiddenDifferentPublication() throws Exception {
        ShareSubject subject = new ShareSubject(1L, 10L, false, null);
        when(shareTokenResolver.resolveSubject("token123")).thenReturn(subject);

        Photo photo = new Photo();
        photo.setId(100L);
        photo.setPersonDbId(5L);
        photo.setMimeType("image/jpeg");
        photo.setData(new byte[]{1, 2, 3});
        when(photoRepository.findById(100L)).thenReturn(Optional.of(photo));

        // Person belongs to a different publication
        Person person = new Person();
        person.setId(5L);
        person.setPublicationId(999L);
        when(personRepository.findById(5L)).thenReturn(Optional.of(person));

        mockMvc.perform(get("/api/shares/token123/photos/100")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.message").value("无权访问该照片"));
    }
}
