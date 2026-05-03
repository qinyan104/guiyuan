package com.genealogy.server.controller;

import com.genealogy.server.config.SecurityConfig;
import com.genealogy.server.config.WebConfig;
import com.genealogy.server.interceptor.AuthInterceptor;
import com.genealogy.server.model.Photo;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PhotoRepository;
import com.genealogy.server.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PhotoController.class)
@Import({WebConfig.class, SecurityConfig.class, PhotoControllerAccessTest.TestConfig.class})
class PhotoControllerAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PhotoRepository photoRepository;

    @MockBean
    private PersonRepository personRepository;

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

    @TestConfiguration
    static class TestConfig {
        @Bean
        AuthInterceptor authInterceptor(ObjectMapper objectMapper) {
            return new AuthInterceptor(new StubUserService(), objectMapper);
        }
    }

    static class StubUserService extends UserService {
        StubUserService() {
            super(null, null);
        }

        @Override
        public String validateToken(String token) {
            return null;
        }
    }
}
