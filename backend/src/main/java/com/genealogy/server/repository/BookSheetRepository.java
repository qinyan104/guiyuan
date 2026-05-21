package com.genealogy.server.repository;

import com.genealogy.server.model.BookSheet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookSheetRepository extends JpaRepository<BookSheet, Long> {
    List<BookSheet> findByDraftIdOrderBySheetNumberAsc(Long draftId);
    void deleteByDraftId(Long draftId);
    long countByDraftId(Long draftId);
}
