package com.genealogy.server.controller;

import com.genealogy.server.dto.*;
import com.genealogy.server.service.PublishingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/publishing")
@Tag(name = "出版", description = "出版草稿管理")
public class PublishingController {

    private final PublishingService publishingService;

    public PublishingController(PublishingService publishingService) {
        this.publishingService = publishingService;
    }

    private Long resolveUserId(@RequestAttribute("userId") Long userId) {
        return userId;
    }

    @Operation(summary = "创建出版草稿", description = "为族谱创建新的出版草稿")
    @PostMapping("/drafts")
    public ResponseEntity<ApiResponse<BookDraftResponse>> createDraft(
            @RequestAttribute("userId") Long userId,
            @Valid @RequestBody BookDraftRequest request) {
        BookDraftResponse response = publishingService.createDraft(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "获取草稿列表", description = "获取指定族谱的所有出版草稿")
    @GetMapping("/drafts")
    public ResponseEntity<ApiResponse<List<BookDraftResponse>>> listDrafts(
            @Parameter(description = "族谱ID") @RequestParam Long publicationId) {
        List<BookDraftResponse> responses = publishingService.listDrafts(publicationId);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @Operation(summary = "获取草稿详情", description = "获取指定出版草稿的详细信息")
    @GetMapping("/drafts/{draftId}")
    public ResponseEntity<ApiResponse<BookDraftResponse>> getDraft(
            @Parameter(description = "草稿ID") @PathVariable Long draftId) {
        BookDraftResponse response = publishingService.getDraft(draftId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "更新草稿", description = "更新出版草稿内容")
    @PutMapping("/drafts/{draftId}")
    public ResponseEntity<ApiResponse<BookDraftResponse>> updateDraft(
            @Parameter(description = "草稿ID") @PathVariable Long draftId,
            @RequestAttribute("userId") Long userId,
            @Valid @RequestBody BookDraftRequest request) {
        BookDraftResponse response = publishingService.updateDraft(draftId, userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "删除草稿", description = "删除指定的出版草稿")
    @DeleteMapping("/drafts/{draftId}")
    public ResponseEntity<ApiResponse<Void>> deleteDraft(
            @Parameter(description = "草稿ID") @PathVariable Long draftId) {
        publishingService.deleteDraft(draftId);
        return ResponseEntity.ok(ApiResponse.success("草稿已删除", null));
    }

    @Operation(summary = "更新人物详情", description = "创建或更新草稿中的人物详情")
    @PutMapping("/drafts/{draftId}/persons")
    public ResponseEntity<ApiResponse<BookPersonDetailResponse>> upsertPersonDetail(
            @Parameter(description = "草稿ID") @PathVariable Long draftId,
            @Valid @RequestBody BookPersonDetailRequest request) {
        BookPersonDetailResponse response = publishingService.upsertPersonDetail(draftId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "获取人物详情列表", description = "获取草稿中的所有人物详情")
    @GetMapping("/drafts/{draftId}/persons")
    public ResponseEntity<ApiResponse<List<BookPersonDetailResponse>>> listPersonDetails(
            @Parameter(description = "草稿ID") @PathVariable Long draftId) {
        List<BookPersonDetailResponse> responses = publishingService.listPersonDetails(draftId);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @Operation(summary = "获取人物详情", description = "获取草稿中指定人物的详情")
    @GetMapping("/drafts/{draftId}/persons/{personId}")
    public ResponseEntity<ApiResponse<BookPersonDetailResponse>> getPersonDetail(
            @Parameter(description = "草稿ID") @PathVariable Long draftId,
            @Parameter(description = "人物ID") @PathVariable String personId) {
        BookPersonDetailResponse response = publishingService.getPersonDetail(draftId, personId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "删除人物详情", description = "删除草稿中指定人物的详情")
    @DeleteMapping("/drafts/{draftId}/persons/{personId}")
    public ResponseEntity<ApiResponse<Void>> deletePersonDetail(
            @Parameter(description = "草稿ID") @PathVariable Long draftId,
            @Parameter(description = "人物ID") @PathVariable String personId) {
        publishingService.deletePersonDetail(draftId, personId);
        return ResponseEntity.ok(ApiResponse.success("人物详情已删除", null));
    }

    @Operation(summary = "获取同步状态", description = "获取草稿的同步状态信息")
    @GetMapping("/drafts/{draftId}/sync-status")
    public ResponseEntity<ApiResponse<DraftSyncStatusResponse>> getSyncStatus(
            @Parameter(description = "草稿ID") @PathVariable Long draftId) {
        DraftSyncStatusResponse response = publishingService.getSyncStatus(draftId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }



    // -- Sheet CRUD --

    @Operation(summary = "保存页面", description = "批量保存出版草稿的页面")
    @PostMapping("/drafts/{draftId}/sheets")
    public ResponseEntity<ApiResponse<List<SheetResponse>>> saveSheets(
            @Parameter(description = "草稿ID") @PathVariable Long draftId,
            @RequestBody List<SheetSaveRequest> sheets) {
        List<SheetResponse> responses = publishingService.saveSheets(draftId, sheets);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @Operation(summary = "获取页面列表", description = "获取草稿的所有页面")
    @GetMapping("/drafts/{draftId}/sheets")
    public ResponseEntity<ApiResponse<List<SheetResponse>>> listSheets(
            @Parameter(description = "草稿ID") @PathVariable Long draftId) {
        List<SheetResponse> responses = publishingService.listSheets(draftId);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @Operation(summary = "删除页面", description = "删除草稿中的指定页面")
    @DeleteMapping("/drafts/{draftId}/sheets/{sheetId}")
    public ResponseEntity<ApiResponse<Void>> deleteSheet(
            @Parameter(description = "草稿ID") @PathVariable Long draftId,
            @Parameter(description = "页面ID") @PathVariable Long sheetId) {
        publishingService.deleteSheet(draftId, sheetId);
        return ResponseEntity.ok(ApiResponse.success(null, null));
    }}