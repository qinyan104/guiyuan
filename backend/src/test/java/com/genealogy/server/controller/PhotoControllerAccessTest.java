package com.genealogy.server.controller;

import com.genealogy.server.config.WebConfig;
import com.genealogy.server.model.Photo;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PhotoRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.RefreshTokenService;
import com.genealogy.server.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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

    @Test
    void getPhotoShouldBeAccessibleWithoutAuthorizationHeader() throws Exception {
        Photo photo = new Photo();
        photo.setId(1L);
        photo.setMimeType("image/png");
        photo.setData(new byte[]{1, 2, 3});
        when(photoRepository.findById(1L)).thenReturn(Optional.of(photo));

        mockMvc.perform(get("/api/photos/1"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/png"))
                .andExpect(content().bytes(new byte[]{1, 2, 3}));
    }
}
