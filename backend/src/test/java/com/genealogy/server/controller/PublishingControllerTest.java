package com.genealogy.server.controller;

import com.genealogy.server.config.WebConfig;
import com.genealogy.server.dto.BookDraftRequest;
import com.genealogy.server.dto.BookDraftResponse;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.PublishingService;
import com.genealogy.server.service.RefreshTokenService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PublishingController.class,
            excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import(WebConfig.class)
@WithMockUser
public class PublishingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PublishingService publishingService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    @MockBean
    private UserRepository userRepository;

    // --- listDrafts ---

    @Test
    public void testListDrafts() throws Exception {
        BookDraftResponse draft1 = new BookDraftResponse();
        draft1.setId(1L);
        draft1.setPublicationId(10L);
        draft1.setTitle("第一稿");
        draft1.setStatus("draft");

        BookDraftResponse draft2 = new BookDraftResponse();
        draft2.setId(2L);
        draft2.setPublicationId(10L);
        draft2.setTitle("第二稿");
        draft2.setStatus("draft");

        when(publishingService.listDrafts(10L)).thenReturn(List.of(draft1, draft2));

        mockMvc.perform(get("/api/publishing/drafts")
                .param("publicationId", "10")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].title").value("第一稿"))
                .andExpect(jsonPath("$.data[1].id").value(2))
                .andExpect(jsonPath("$.data[1].title").value("第二稿"));
    }

    @Test
    public void testListDraftsEmpty() throws Exception {
        when(publishingService.listDrafts(10L)).thenReturn(List.of());

        mockMvc.perform(get("/api/publishing/drafts")
                .param("publicationId", "10")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    // --- createDraft ---

    @Test
    public void testCreateDraft() throws Exception {
        BookDraftResponse response = new BookDraftResponse();
        response.setId(1L);
        response.setPublicationId(10L);
        response.setTitle("新草稿");
        response.setSubtitle("副标题");
        response.setStatus("draft");
        response.setVersion(1);

        when(publishingService.createDraft(eq(1L), any(BookDraftRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/publishing/drafts")
                .requestAttr("userId", 1L)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"publicationId\":10,\"title\":\"新草稿\",\"subtitle\":\"副标题\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.publicationId").value(10))
                .andExpect(jsonPath("$.data.title").value("新草稿"))
                .andExpect(jsonPath("$.data.subtitle").value("副标题"))
                .andExpect(jsonPath("$.data.status").value("draft"));
    }

    // --- getDraft ---

    @Test
    public void testGetDraft() throws Exception {
        BookDraftResponse response = new BookDraftResponse();
        response.setId(1L);
        response.setPublicationId(10L);
        response.setTitle("已有草稿");
        response.setPreface("前言内容");
        response.setStatus("draft");

        when(publishingService.getDraft(1L)).thenReturn(response);

        mockMvc.perform(get("/api/publishing/drafts/1")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.title").value("已有草稿"))
                .andExpect(jsonPath("$.data.preface").value("前言内容"));
    }

    // --- updateDraft ---

    @Test
    public void testUpdateDraft() throws Exception {
        BookDraftResponse response = new BookDraftResponse();
        response.setId(1L);
        response.setPublicationId(10L);
        response.setTitle("更新后的标题");
        response.setStatus("draft");

        when(publishingService.updateDraft(eq(1L), eq(1L), any(BookDraftRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/publishing/drafts/1")
                .requestAttr("userId", 1L)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"publicationId\":10,\"title\":\"更新后的标题\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.title").value("更新后的标题"));
    }

    // --- deleteDraft ---

    @Test
    public void testDeleteDraft() throws Exception {
        doNothing().when(publishingService).deleteDraft(1L);

        mockMvc.perform(delete("/api/publishing/drafts/1")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("草稿已删除"));

        verify(publishingService).deleteDraft(1L);
    }

    // --- listPersonDetails ---

    @Test
    public void testListPersonDetails() throws Exception {
        when(publishingService.listPersonDetails(1L)).thenReturn(List.of());

        mockMvc.perform(get("/api/publishing/drafts/1/persons")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    // --- deletePersonDetail ---

    @Test
    public void testDeletePersonDetail() throws Exception {
        doNothing().when(publishingService).deletePersonDetail(1L, "p1");

        mockMvc.perform(delete("/api/publishing/drafts/1/persons/p1")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("人物详情已删除"));

        verify(publishingService).deletePersonDetail(1L, "p1");
    }

    // --- getSyncStatus ---

    @Test
    public void testGetSyncStatus() throws Exception {
        com.genealogy.server.dto.DraftSyncStatusResponse syncResp = new com.genealogy.server.dto.DraftSyncStatusResponse();
        syncResp.setDraftId(1L);
        syncResp.setCurrentRevision(5L);
        syncResp.setSnapshotRevision(3L);
        syncResp.setHasPendingSync(true);
        syncResp.setChanges(List.of());

        when(publishingService.getSyncStatus(1L)).thenReturn(syncResp);

        mockMvc.perform(get("/api/publishing/drafts/1/sync-status")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.draftId").value(1))
                .andExpect(jsonPath("$.data.currentRevision").value(5))
                .andExpect(jsonPath("$.data.snapshotRevision").value(3))
                .andExpect(jsonPath("$.data.hasPendingSync").value(true));
    }

    // --- listSheets ---

    @Test
    public void testListSheets() throws Exception {
        when(publishingService.listSheets(1L)).thenReturn(List.of());

        mockMvc.perform(get("/api/publishing/drafts/1/sheets")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    // --- deleteSheet ---

    @Test
    public void testDeleteSheet() throws Exception {
        doNothing().when(publishingService).deleteSheet(1L, 100L);

        mockMvc.perform(delete("/api/publishing/drafts/1/sheets/100")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(publishingService).deleteSheet(1L, 100L);
    }
}
