package com.genealogy.server.controller;

import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private UserService userService;

    @Test
    @WithMockUser
    public void testSearchUsers() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setUsername("testuser");
        user.setNickname("Alice");

        when(userService.validateToken("test-token")).thenReturn("user");
        when(userRepository.findByUsernameContainingIgnoreCaseOrNicknameContainingIgnoreCase("test", "test"))
                .thenReturn(List.of(user));

        mockMvc.perform(get("/api/users/search?q=test")
                .header("Authorization", "Bearer test-token")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].username").value("testuser"))
                .andExpect(jsonPath("$[0].nickname").value("Alice"));
    }

    @Test
    @WithMockUser
    public void testSearchUsersEmptyQuery() throws Exception {
        when(userService.validateToken("test-token")).thenReturn("user");

        mockMvc.perform(get("/api/users/search?q=")
                .header("Authorization", "Bearer test-token")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}
