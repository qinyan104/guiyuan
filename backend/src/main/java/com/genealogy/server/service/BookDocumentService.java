package com.genealogy.server.service;

import com.genealogy.server.dto.BookDocumentRequest;
import com.genealogy.server.dto.BookDocumentResponse;
import com.genealogy.server.model.BookDocument;
import com.genealogy.server.repository.BookDocumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookDocumentService {
    private final BookDocumentRepository repository;

    public BookDocumentService(BookDocumentRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public BookDocumentResponse getLatest(Long publicationId) {
        return repository.findFirstByPublicationIdOrderByUpdatedAtDesc(publicationId)
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional
    public BookDocumentResponse save(Long publicationId, Long userId, BookDocumentRequest request) {
        BookDocument document = repository.findFirstByPublicationIdOrderByUpdatedAtDesc(publicationId)
                .orElseGet(BookDocument::new);
        if (document.getId() == null) {
            document.setPublicationId(publicationId);
            document.setCreatedBy(userId);
        }
        document.setUpdatedBy(userId);
        document.setTitle(request.getTitle() == null || request.getTitle().isBlank() ? "未命名书稿" : request.getTitle());
        document.setDocumentJson(request.getDocumentJson());
        return toResponse(repository.save(document));
    }

    private BookDocumentResponse toResponse(BookDocument document) {
        BookDocumentResponse response = new BookDocumentResponse();
        response.setId(document.getId());
        response.setPublicationId(document.getPublicationId());
        response.setTitle(document.getTitle());
        response.setDocumentJson(document.getDocumentJson());
        response.setCreatedAt(document.getCreatedAt());
        response.setUpdatedAt(document.getUpdatedAt());
        return response;
    }
}
