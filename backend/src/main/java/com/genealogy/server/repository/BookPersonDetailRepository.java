package com.genealogy.server.repository;

import com.genealogy.server.model.BookPersonDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookPersonDetailRepository extends JpaRepository<BookPersonDetail, Long> {
    List<BookPersonDetail> findByDraftId(Long draftId);
    Optional<BookPersonDetail> findByDraftIdAndPersonId(Long draftId, String personId);
    void deleteByDraftIdAndPersonId(Long draftId, String personId);
}
