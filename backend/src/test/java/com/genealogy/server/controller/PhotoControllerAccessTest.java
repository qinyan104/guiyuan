package com.genealogy.server.controller;

import com.genealogy.server.model.Photo;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PhotoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PhotoControllerAccessTest {

    @Mock
    private PhotoRepository photoRepository;

    @Mock
    private PersonRepository personRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        PhotoController controller = new PhotoController(photoRepository, personRepository);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

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
