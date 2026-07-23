package com.genealogy.server.repository;

import com.genealogy.server.model.BookDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BookDocumentRepository extends JpaRepository<BookDocument, Long> {
    Optional<BookDocument> findFirstByPublicationIdOrderByUpdatedAtDesc(Long publicationId);
}
