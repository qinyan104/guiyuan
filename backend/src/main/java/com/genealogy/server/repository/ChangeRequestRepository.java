package com.genealogy.server.repository;

import com.genealogy.server.model.ChangeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChangeRequestRepository extends JpaRepository<ChangeRequest, Long> {
    List<ChangeRequest> findByPublicationIdAndStatus(Long publicationId, String status);
    List<ChangeRequest> findByPublicationId(Long publicationId);
    Optional<ChangeRequest> findByIdAndPublicationId(Long id, Long publicationId);
    List<ChangeRequest> findByPersonDbIdAndStatus(Long personDbId, String status);
    boolean existsByPersonDbIdAndStatus(Long personDbId, String status);
}
