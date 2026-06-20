package com.genealogy.server.controller;

import com.genealogy.server.config.WebConfig;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.RefreshTokenService;
import com.genealogy.server.service.ReviewService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ReviewController.class,
            excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import(WebConfig.class)
@WithMockUser
public class ReviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ReviewService reviewService;

    @MockBean
    private PublicationAuthorizationService authorizationService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    private void setupUserMocks() {
        User user = new User();
        user.setId(1L);
        user.setUsername("testuser");
        user.setNickname("Test User");
        user.setRole("SUPER_ADMIN");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
    }

    @Test
    public void testListReviews() throws Exception {
        setupUserMocks();

        List<Map<String, Object>> reviews = List.of(
                Map.of("id", 1L, "status", "pending", "personName", "张三"),
                Map.of("id", 2L, "status", "approved", "personName", "李四")
        );
        when(reviewService.listReviews(1L, null)).thenReturn(reviews);

        mockMvc.perform(get("/api/publications/1/reviews")
                .requestAttr("currentUsername", "testuser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].status").value("pending"))
                .andExpect(jsonPath("$.data[1].id").value(2))
                .andExpect(jsonPath("$.data[1].status").value("approved"));
    }

    @Test
    public void testApproveReview() throws Exception {
        setupUserMocks();
        doNothing().when(authorizationService).require(any(), eq(1L), any());
        doNothing().when(reviewService).approve(1L, 1L);

        mockMvc.perform(post("/api/publications/1/reviews/1/approve")
                .requestAttr("currentUsername", "testuser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(reviewService).approve(1L, 1L);
    }

    @Test
    public void testRejectReview() throws Exception {
        setupUserMocks();
        doNothing().when(authorizationService).require(any(), eq(1L), any());
        doNothing().when(reviewService).reject(1L, 1L, "信息有误");

        mockMvc.perform(post("/api/publications/1/reviews/1/reject")
                .requestAttr("currentUsername", "testuser")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"信息有误\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(reviewService).reject(1L, 1L, "信息有误");
    }

    @Test
    public void testRejectReviewEmptyReason() throws Exception {
        setupUserMocks();
        doNothing().when(authorizationService).require(any(), eq(1L), any());

        mockMvc.perform(post("/api/publications/1/reviews/1/reject")
                .requestAttr("currentUsername", "testuser")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("拒绝原因不能为空"));
    }
}
