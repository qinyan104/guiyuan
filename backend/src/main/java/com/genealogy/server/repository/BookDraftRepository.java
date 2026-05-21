package com.genealogy.server.repository;

import com.genealogy.server.model.BookDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookDraftRepository extends JpaRepository<BookDraft, Long> {
    List<BookDraft> findByPublicationIdOrderByUpdatedAtDesc(Long publicationId);
    Optional<BookDraft> findByPublicationIdAndStatus(Long publicationId, String status);
    long countByPublicationId(Long publicationId);
}
