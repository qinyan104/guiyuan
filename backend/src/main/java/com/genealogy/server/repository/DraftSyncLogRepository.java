package com.genealogy.server.repository;

import com.genealogy.server.model.DraftSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DraftSyncLogRepository extends JpaRepository<DraftSyncLog, Long> {
    List<DraftSyncLog> findByDraftIdOrderByCreatedAtDesc(Long draftId);
    List<DraftSyncLog> findByDraftIdAndAcknowledged(Long draftId, Boolean acknowledged);
    void deleteByDraftId(Long draftId);
}
