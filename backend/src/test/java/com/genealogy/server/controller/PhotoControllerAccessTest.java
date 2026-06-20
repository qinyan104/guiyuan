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
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PhotoController.class,
            excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import(WebConfig.class)
class PhotoControllerAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PhotoRepository photoRepository;

    @MockBean
    private PersonRepository personRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private PublicationAuthorizationService authorizationService;

    @Test
    void getPhotoShouldRequireLogin() throws Exception {
        Photo photo = new Photo();
        photo.setId(1L);
        photo.setPersonDbId(10L);
        photo.setMimeType("image/png");
        photo.setData(new byte[]{1, 2, 3});

        Person person = new Person();
        person.setId(10L);
        person.setPublicationId(99L);

        when(photoRepository.findById(1L)).thenReturn(Optional.of(photo));
        when(personRepository.findById(10L)).thenReturn(Optional.of(person));

        mockMvc.perform(get("/api/photos/1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.message").value("未登录"));
    }

    @Test
    void getPhotoShouldReturnContentForAuthorizedUser() throws Exception {
        Photo photo = new Photo();
        photo.setId(1L);
        photo.setPersonDbId(10L);
        photo.setMimeType("image/png");
        photo.setData(new byte[]{1, 2, 3});

        Person person = new Person();
        person.setId(10L);
        person.setPublicationId(99L);

        User user = new User();
        user.setId(7L);
        user.setUsername("tester");
        user.setRole("USER");

        when(photoRepository.findById(1L)).thenReturn(Optional.of(photo));
        when(personRepository.findById(10L)).thenReturn(Optional.of(person));
        when(userRepository.findByUsername("tester")).thenReturn(Optional.of(user));
        doNothing().when(authorizationService)
                .require(any(UserSubject.class), eq(99L), eq(AccessPermission.READ_FULL));

        mockMvc.perform(get("/api/photos/1").requestAttr("currentUsername", "tester"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/png"))
                .andExpect(content().bytes(new byte[]{1, 2, 3}));
    }

    @Test
    void deletePhotoShouldClearPersonPhotoId() throws Exception {
        Photo photo = new Photo();
        photo.setId(1L);
        photo.setPersonDbId(10L);

        Person person = new Person();
        person.setId(10L);
        person.setPublicationId(99L);
        person.setPhotoId(1L);

        User user = new User();
        user.setId(7L);
        user.setUsername("tester");
        user.setRole("USER");

        when(photoRepository.findById(1L)).thenReturn(Optional.of(photo));
        when(personRepository.findById(10L)).thenReturn(Optional.of(person));
        when(userRepository.findByUsername("tester")).thenReturn(Optional.of(user));
        doNothing().when(authorizationService)
                .require(any(UserSubject.class), eq(99L), eq(AccessPermission.EDIT));

        mockMvc.perform(delete("/api/photos/1").requestAttr("currentUsername", "tester"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("删除成功"));

        ArgumentCaptor<Person> personCaptor = ArgumentCaptor.forClass(Person.class);
        verify(personRepository).save(personCaptor.capture());
        assertThat(personCaptor.getValue().getPhotoId()).isNull();
        verify(photoRepository).delete(photo);
    }
}
