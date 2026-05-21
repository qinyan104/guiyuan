package com.genealogy.server.controller;

import com.genealogy.server.dto.*;
import com.genealogy.server.service.PublishingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/publishing")
public class PublishingController {

    private final PublishingService publishingService;

    public PublishingController(PublishingService publishingService) {
        this.publishingService = publishingService;
    }

    private Long resolveUserId(@RequestAttribute("userId") Long userId) {
        return userId;
    }

    @PostMapping("/drafts")
    public ResponseEntity<ApiResponse<BookDraftResponse>> createDraft(
            @RequestAttribute("userId") Long userId,
            @Valid @RequestBody BookDraftRequest request) {
        BookDraftResponse response = publishingService.createDraft(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/drafts")
    public ResponseEntity<ApiResponse<List<BookDraftResponse>>> listDrafts(
            @RequestParam Long publicationId) {
        List<BookDraftResponse> responses = publishingService.listDrafts(publicationId);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/drafts/{draftId}")
    public ResponseEntity<ApiResponse<BookDraftResponse>> getDraft(
            @PathVariable Long draftId) {
        BookDraftResponse response = publishingService.getDraft(draftId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/drafts/{draftId}")
    public ResponseEntity<ApiResponse<BookDraftResponse>> updateDraft(
            @PathVariable Long draftId,
            @RequestAttribute("userId") Long userId,
            @Valid @RequestBody BookDraftRequest request) {
        BookDraftResponse response = publishingService.updateDraft(draftId, userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/drafts/{draftId}")
    public ResponseEntity<ApiResponse<Void>> deleteDraft(
            @PathVariable Long draftId) {
        publishingService.deleteDraft(draftId);
        return ResponseEntity.ok(ApiResponse.success("草稿已删除", null));
    }

    @PutMapping("/drafts/{draftId}/persons")
    public ResponseEntity<ApiResponse<BookPersonDetailResponse>> upsertPersonDetail(
            @PathVariable Long draftId,
            @Valid @RequestBody BookPersonDetailRequest request) {
        BookPersonDetailResponse response = publishingService.upsertPersonDetail(draftId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/drafts/{draftId}/persons")
    public ResponseEntity<ApiResponse<List<BookPersonDetailResponse>>> listPersonDetails(
            @PathVariable Long draftId) {
        List<BookPersonDetailResponse> responses = publishingService.listPersonDetails(draftId);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/drafts/{draftId}/persons/{personId}")
    public ResponseEntity<ApiResponse<BookPersonDetailResponse>> getPersonDetail(
            @PathVariable Long draftId,
            @PathVariable String personId) {
        BookPersonDetailResponse response = publishingService.getPersonDetail(draftId, personId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/drafts/{draftId}/persons/{personId}")
    public ResponseEntity<ApiResponse<Void>> deletePersonDetail(
            @PathVariable Long draftId,
            @PathVariable String personId) {
        publishingService.deletePersonDetail(draftId, personId);
        return ResponseEntity.ok(ApiResponse.success("人物详情已删除", null));
    }

    @GetMapping("/drafts/{draftId}/sync-status")
    public ResponseEntity<ApiResponse<DraftSyncStatusResponse>> getSyncStatus(
            @PathVariable Long draftId) {
        DraftSyncStatusResponse response = publishingService.getSyncStatus(draftId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
