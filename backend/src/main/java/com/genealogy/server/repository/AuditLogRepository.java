package com.genealogy.server.repository;

import com.genealogy.server.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<AuditLog> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String targetType, Long targetId);
    Optional<AuditLog> findTopByTargetTypeAndTargetIdAndActionInOrderByCreatedAtDesc(
            String targetType,
            Long targetId,
            Collection<String> actions
    );

    @Query("SELECT a FROM AuditLog a WHERE a.targetType = :targetType AND a.targetId IN :targetIds AND a.action IN :actions ORDER BY a.createdAt DESC")
    List<AuditLog> findLatestByTargetIds(@Param("targetType") String targetType,
                                          @Param("targetIds") Collection<Long> targetIds,
                                          @Param("actions") Collection<String> actions);
}
