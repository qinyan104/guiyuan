package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.config.WebConfig;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.Photo;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PhotoRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.RefreshTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PhotoController.class,
            excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import(WebConfig.class)
@WithMockUser
@TestPropertySource(properties = "app.photo.max-file-size-bytes=4")
class PhotoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PhotoRepository photoRepository;

    @MockBean
    private PersonRepository personRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private PublicationAuthorizationService authorizationService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    private User mockUser() {
        User user = new User();
        user.setId(7L);
        user.setUsername("admin");
        user.setRole("SUPER_ADMIN");
        return user;
    }

    // --- upload ---

    @Test
    void uploadPhotoSuccess() throws Exception {
        User user = mockUser();
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
        doNothing().when(authorizationService)
                .require(any(UserSubject.class), eq(10L), eq(AccessPermission.EDIT));

        Person person = new Person();
        person.setId(5L);
        person.setPersonId("p1");
        person.setPublicationId(10L);
        when(personRepository.findByPublicationIdAndPersonId(10L, "p1"))
                .thenReturn(Optional.of(person));
        when(photoRepository.findByPersonDbId(5L)).thenReturn(Optional.empty());

        Photo savedPhoto = new Photo();
        savedPhoto.setId(100L);
        savedPhoto.setPersonDbId(5L);
        savedPhoto.setMimeType("image/jpeg");
        savedPhoto.setData(new byte[]{1, 2, 3});
        when(photoRepository.save(any(Photo.class))).thenReturn(savedPhoto);
        when(personRepository.save(any(Person.class))).thenReturn(person);

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/photos")
                .file(file)
                .param("personId", "p1")
                .param("publicationId", "10")
                .requestAttr("currentUsername", "admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("上传成功"))
                .andExpect(jsonPath("$.data.id").value(100));
    }

    @Test
    void uploadPhotoInvalidType() throws Exception {
        User user = mockUser();
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
        doNothing().when(authorizationService)
                .require(any(UserSubject.class), eq(10L), eq(AccessPermission.EDIT));

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.bmp", "image/bmp", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/photos")
                .file(file)
                .param("personId", "p1")
                .param("publicationId", "10")
                .requestAttr("currentUsername", "admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.message").value("仅支持 JPG、PNG、GIF、WebP 格式的图片"));

        verify(personRepository, never()).findByPublicationIdAndPersonId(any(), any());
    }

    @Test
    void uploadPhotoTooLarge() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3, 4, 5});

        mockMvc.perform(multipart("/api/photos")
                .file(file)
                .param("personId", "p1")
                .param("publicationId", "10")
                .requestAttr("currentUsername", "admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("图片大小不能超过")));

        verify(userRepository, never()).findByUsername(any());
        verify(personRepository, never()).findByPublicationIdAndPersonId(any(), any());
    }

    @Test
    void uploadPhotoPersonNotFound() throws Exception {
        User user = mockUser();
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
        doNothing().when(authorizationService)
                .require(any(UserSubject.class), eq(10L), eq(AccessPermission.EDIT));

        when(personRepository.findByPublicationIdAndPersonId(10L, "p_nonexistent"))
                .thenReturn(Optional.empty());

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/photos")
                .file(file)
                .param("personId", "p_nonexistent")
                .param("publicationId", "10")
                .requestAttr("currentUsername", "admin"))
                .andExpect(status().isNotFound());
    }

    // --- get ---

    @Test
    void getPhotoReturnsBytes() throws Exception {
        Photo photo = new Photo();
        photo.setId(1L);
        photo.setPersonDbId(10L);
        photo.setMimeType("image/png");
        photo.setData(new byte[]{10, 20, 30});

        Person person = new Person();
        person.setId(10L);
        person.setPublicationId(99L);

        User user = mockUser();
        when(photoRepository.findById(1L)).thenReturn(Optional.of(photo));
        when(personRepository.findById(10L)).thenReturn(Optional.of(person));
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
        doNothing().when(authorizationService)
                .require(any(UserSubject.class), eq(99L), eq(AccessPermission.READ_FULL));

        mockMvc.perform(get("/api/photos/1")
                .requestAttr("currentUsername", "admin"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/png"))
                .andExpect(content().bytes(new byte[]{10, 20, 30}));
    }

    @Test
    void getPhotoNotFound() throws Exception {
        when(photoRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/photos/999")
                .requestAttr("currentUsername", "admin"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getPhotoPersonNotFound() throws Exception {
        Photo photo = new Photo();
        photo.setId(1L);
        photo.setPersonDbId(10L);

        when(photoRepository.findById(1L)).thenReturn(Optional.of(photo));
        when(personRepository.findById(10L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/photos/1")
                .requestAttr("currentUsername", "admin"))
                .andExpect(status().isNotFound());
    }

    // --- delete ---

    @Test
    void deletePhotoSuccess() throws Exception {
        Photo photo = new Photo();
        photo.setId(1L);
        photo.setPersonDbId(10L);

        Person person = new Person();
        person.setId(10L);
        person.setPublicationId(99L);
        person.setPhotoId(1L);

        User user = mockUser();
        when(photoRepository.findById(1L)).thenReturn(Optional.of(photo));
        when(personRepository.findById(10L)).thenReturn(Optional.of(person));
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
        doNothing().when(authorizationService)
                .require(any(UserSubject.class), eq(99L), eq(AccessPermission.EDIT));

        mockMvc.perform(delete("/api/photos/1")
                .requestAttr("currentUsername", "admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("删除成功"));

        verify(personRepository).save(person);
        verify(photoRepository).delete(photo);
    }

    @Test
    void deletePhotoNotAssociatedWithPerson() throws Exception {
        Photo photo = new Photo();
        photo.setId(1L);
        photo.setPersonDbId(10L);

        // person's photoId is different — photo is orphaned
        Person person = new Person();
        person.setId(10L);
        person.setPublicationId(99L);
        person.setPhotoId(2L);

        User user = mockUser();
        when(photoRepository.findById(1L)).thenReturn(Optional.of(photo));
        when(personRepository.findById(10L)).thenReturn(Optional.of(person));
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
        doNothing().when(authorizationService)
                .require(any(UserSubject.class), eq(99L), eq(AccessPermission.EDIT));

        mockMvc.perform(delete("/api/photos/1")
                .requestAttr("currentUsername", "admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // Person should NOT be saved since photoId != this photo
        verify(personRepository, never()).save(any());
        verify(photoRepository).delete(photo);
    }

    @Test
    void deletePhotoNotFound() throws Exception {
        when(photoRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(delete("/api/photos/999")
                .requestAttr("currentUsername", "admin"))
                .andExpect(status().isNotFound());
    }

    @Test
    void uploadPhotoUnauthorized() throws Exception {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/photos")
                .file(file)
                .param("personId", "p1")
                .param("publicationId", "10")
                .requestAttr("currentUsername", "unknown"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.message").value("未登录"));
    }
}
