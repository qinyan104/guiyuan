package com.genealogy.server.service;

import com.genealogy.server.dto.*;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.*;
import com.genealogy.server.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class PublishingService {

    private final BookDraftRepository bookDraftRepository;
    private final BookSheetRepository bookSheetRepository;
    private final BookPersonDetailRepository bookPersonDetailRepository;
    private final SheetElementOverrideRepository sheetElementOverrideRepository;
    private final DraftSyncLogRepository draftSyncLogRepository;
    private final PublicationRepository publicationRepository;
    private final PersonRepository personRepository;

    public PublishingService(BookDraftRepository bookDraftRepository,
                             BookSheetRepository bookSheetRepository,
                             BookPersonDetailRepository bookPersonDetailRepository,
                             SheetElementOverrideRepository sheetElementOverrideRepository,
                             DraftSyncLogRepository draftSyncLogRepository,
                             PublicationRepository publicationRepository,
                             PersonRepository personRepository) {
        this.bookDraftRepository = bookDraftRepository;
        this.bookSheetRepository = bookSheetRepository;
        this.bookPersonDetailRepository = bookPersonDetailRepository;
        this.sheetElementOverrideRepository = sheetElementOverrideRepository;
        this.draftSyncLogRepository = draftSyncLogRepository;
        this.publicationRepository = publicationRepository;
        this.personRepository = personRepository;
    }

    // -- Draft CRUD --

    @Transactional
    public BookDraftResponse createDraft(Long userId, BookDraftRequest request) {
        BookDraft draft = new BookDraft();
        draft.setPublicationId(request.getPublicationId());
        draft.setTitle(request.getTitle());
        draft.setSubtitle(request.getSubtitle());
        draft.setPreface(request.getPreface());
        draft.setEpilogue(request.getEpilogue());
        draft.setStyleConfig(request.getStyleConfig());
        draft.setStatus("draft");
        draft.setVersion(1);
        draft.setSnapshotRevision(0L);
        draft.setCreatedBy(userId);
        draft.setUpdatedBy(userId);

        BookDraft saved = bookDraftRepository.save(draft);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<BookDraftResponse> listDrafts(Long publicationId) {
        List<BookDraft> drafts = bookDraftRepository.findByPublicationIdOrderByUpdatedAtDesc(publicationId);
        List<BookDraftResponse> responses = new ArrayList<>();
        for (BookDraft draft : drafts) {
            responses.add(toResponse(draft));
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public BookDraftResponse getDraft(Long draftId) {
        BookDraft draft = bookDraftRepository.findById(draftId)
                .orElseThrow(() -> new NotFoundException("草稿不存在"));
        return toResponse(draft);
    }

    @Transactional
    public BookDraftResponse updateDraft(Long draftId, Long userId, BookDraftRequest request) {
        BookDraft draft = bookDraftRepository.findById(draftId)
                .orElseThrow(() -> new NotFoundException("草稿不存在"));

        if (request.getTitle() != null) {
            draft.setTitle(request.getTitle());
        }
        if (request.getSubtitle() != null) {
            draft.setSubtitle(request.getSubtitle());
        }
        if (request.getPreface() != null) {
            draft.setPreface(request.getPreface());
        }
        if (request.getEpilogue() != null) {
            draft.setEpilogue(request.getEpilogue());
        }
        if (request.getStyleConfig() != null) {
            draft.setStyleConfig(request.getStyleConfig());
        }
        draft.setUpdatedBy(userId);

        BookDraft saved = bookDraftRepository.save(draft);
        return toResponse(saved);
    }

    @Transactional
    public void deleteDraft(Long draftId) {
        BookDraft draft = bookDraftRepository.findById(draftId)
                .orElseThrow(() -> new NotFoundException("草稿不存在"));
        bookDraftRepository.delete(draft);
    }

    // -- Person Detail CRUD --

    @Transactional
    public BookPersonDetailResponse upsertPersonDetail(Long draftId, BookPersonDetailRequest request) {
        BookDraft draft = bookDraftRepository.findById(draftId)
                .orElseThrow(() -> new NotFoundException("草稿不存在"));

        BookPersonDetail detail = bookPersonDetailRepository
                .findByDraftIdAndPersonId(draftId, request.getPersonId())
                .orElse(null);

        if (detail == null) {
            detail = new BookPersonDetail();
            detail.setDraftId(draftId);
            detail.setPersonId(request.getPersonId());
        }

        if (request.getBiography() != null) {
            detail.setBiography(request.getBiography());
        }
        if (request.getInterlinearNotes() != null) {
            detail.setInterlinearNotes(request.getInterlinearNotes());
        }
        if (request.getSealStyle() != null) {
            detail.setSealStyle(request.getSealStyle());
        }
        if (request.getUserModified() != null) {
            detail.setUserModified(request.getUserModified());
        }

        BookPersonDetail saved = bookPersonDetailRepository.save(detail);
        return toDetailResponse(saved, draft.getPublicationId());
    }

    @Transactional(readOnly = true)
    public List<BookPersonDetailResponse> listPersonDetails(Long draftId) {
        BookDraft draft = bookDraftRepository.findById(draftId)
                .orElseThrow(() -> new NotFoundException("草稿不存在"));

        List<BookPersonDetail> details = bookPersonDetailRepository.findByDraftId(draftId);
        List<BookPersonDetailResponse> responses = new ArrayList<>();
        for (BookPersonDetail detail : details) {
            responses.add(toDetailResponse(detail, draft.getPublicationId()));
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public BookPersonDetailResponse getPersonDetail(Long draftId, String personId) {
        BookDraft draft = bookDraftRepository.findById(draftId)
                .orElseThrow(() -> new NotFoundException("草稿不存在"));

        BookPersonDetail detail = bookPersonDetailRepository
                .findByDraftIdAndPersonId(draftId, personId)
                .orElseThrow(() -> new NotFoundException("人物详情不存在"));

        return toDetailResponse(detail, draft.getPublicationId());
    }

    @Transactional
    public void deletePersonDetail(Long draftId, String personId) {
        BookDraft draft = bookDraftRepository.findById(draftId)
                .orElseThrow(() -> new NotFoundException("草稿不存在"));

        bookPersonDetailRepository.deleteByDraftIdAndPersonId(draftId, personId);
    }

    // -- Sync Status --

    @Transactional(readOnly = true)
    public DraftSyncStatusResponse getSyncStatus(Long draftId) {
        BookDraft draft = bookDraftRepository.findById(draftId)
                .orElseThrow(() -> new NotFoundException("草稿不存在"));

        Publication publication = publicationRepository.findById(draft.getPublicationId())
                .orElseThrow(() -> new NotFoundException("族谱不存在"));

        DraftSyncStatusResponse response = new DraftSyncStatusResponse();
        response.setDraftId(draftId);
        response.setCurrentRevision(publication.getRevision());
        response.setSnapshotRevision(draft.getSnapshotRevision());

        boolean hasPending = !publication.getRevision().equals(draft.getSnapshotRevision());
        response.setHasPendingSync(hasPending);

        List<DraftSyncLog> logs = draftSyncLogRepository
                .findByDraftIdOrderByCreatedAtDesc(draftId);
        List<DraftSyncStatusResponse.SyncEntry> entries = new ArrayList<>();
        for (DraftSyncLog log : logs) {
            DraftSyncStatusResponse.SyncEntry entry = new DraftSyncStatusResponse.SyncEntry();
            entry.setPersonId(log.getPersonId());
            entry.setChangeType(log.getChangeType());
            entry.setAcknowledged(Boolean.TRUE.equals(log.getAcknowledged()));

            // Resolve person name
            if (log.getPersonId() != null) {
                personRepository.findByPublicationIdAndPersonId(
                        draft.getPublicationId(), log.getPersonId())
                        .ifPresent(p -> entry.setPersonName(p.getName()));
            }

            entries.add(entry);
        }
        response.setChanges(entries);

        return response;
    }

    // -- 
    // -- Sheet CRUD --

    @Transactional
    public List<SheetResponse> saveSheets(Long draftId, List<SheetSaveRequest> requests) {
        BookDraft draft = bookDraftRepository.findById(draftId)
                .orElseThrow(() -> new NotFoundException("草稿不存在"));

        bookSheetRepository.deleteByDraftId(draftId);

        List<SheetResponse> responses = new ArrayList<>();
        for (SheetSaveRequest req : requests) {
            BookSheet sheet = new BookSheet();
            sheet.setDraftId(draftId);
            sheet.setSheetNumber(req.getSheetNumber());
            sheet.setSheetType(req.getSheetType() != null ? req.getSheetType() : "genealogy");
            sheet.setLayoutData(req.getLayoutData());
            sheet.setAutoGeneratedAt(java.time.LocalDateTime.now());

            BookSheet saved = bookSheetRepository.save(sheet);
            responses.add(toSheetResponse(saved));
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public List<SheetResponse> listSheets(Long draftId) {
        bookDraftRepository.findById(draftId)
                .orElseThrow(() -> new NotFoundException("草稿不存在"));

        List<BookSheet> sheets = bookSheetRepository.findByDraftIdOrderBySheetNumberAsc(draftId);
        List<SheetResponse> responses = new ArrayList<>();
        for (BookSheet sheet : sheets) {
            responses.add(toSheetResponse(sheet));
        }
        return responses;
    }

    @Transactional
    public void deleteSheet(Long draftId, Long sheetId) {
        BookSheet sheet = bookSheetRepository.findById(sheetId)
                .orElseThrow(() -> new NotFoundException("书页不存在"));
        if (!sheet.getDraftId().equals(draftId)) {
            throw new NotFoundException("书页不属于该草稿");
        }
        bookSheetRepository.delete(sheet);
    }
    // -- Private helpers --

    private BookDraftResponse toResponse(BookDraft draft) {
        BookDraftResponse resp = new BookDraftResponse();
        resp.setId(draft.getId());
        resp.setPublicationId(draft.getPublicationId());
        resp.setTitle(draft.getTitle());
        resp.setSubtitle(draft.getSubtitle());
        resp.setPreface(draft.getPreface());
        resp.setEpilogue(draft.getEpilogue());
        resp.setStyleConfig(draft.getStyleConfig());
        resp.setStatus(draft.getStatus());
        resp.setVersion(draft.getVersion());
        resp.setSnapshotRevision(draft.getSnapshotRevision());
        resp.setCreatedBy(draft.getCreatedBy());
        resp.setUpdatedBy(draft.getUpdatedBy());
        resp.setCreatedAt(draft.getCreatedAt());
        resp.setUpdatedAt(draft.getUpdatedAt());

        // Load sheet count
        resp.setSheetCount((int) bookSheetRepository.countByDraftId(draft.getId()));

        // Load publication title
        publicationRepository.findById(draft.getPublicationId())
                .ifPresent(pub -> resp.setPublicationTitle(pub.getTitle()));

        return resp;
    }

        private SheetResponse toSheetResponse(BookSheet sheet) {
        SheetResponse resp = new SheetResponse();
        resp.setId(sheet.getId());
        resp.setSheetNumber(sheet.getSheetNumber());
        resp.setSheetType(sheet.getSheetType());
        resp.setLayoutData(sheet.getLayoutData());
        resp.setAutoGeneratedAt(sheet.getAutoGeneratedAt());
        return resp;
    }
private BookPersonDetailResponse toDetailResponse(BookPersonDetail detail, Long publicationId) {
        BookPersonDetailResponse resp = new BookPersonDetailResponse();
        resp.setId(detail.getId());
        resp.setPersonId(detail.getPersonId());
        resp.setBiography(detail.getBiography());
        resp.setInterlinearNotes(detail.getInterlinearNotes());
        resp.setSealStyle(detail.getSealStyle());
        resp.setUserModified(detail.getUserModified());
        resp.setSourceFieldsHash(detail.getSourceFieldsHash());
        resp.setUpdatedAt(detail.getUpdatedAt());

        // Resolve person name
        personRepository.findByPublicationIdAndPersonId(publicationId, detail.getPersonId())
                .ifPresent(p -> resp.setPersonName(p.getName()));

        return resp;
    }
}
