package com.genealogy.server.repository;

import com.genealogy.server.model.PublicationAccess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PublicationAccessRepository extends JpaRepository<PublicationAccess, Long> {
    Optional<PublicationAccess> findByPublicationIdAndUserId(Long publicationId, Long userId);
    List<PublicationAccess> findByUserId(Long userId);
    List<PublicationAccess> findByPublicationId(Long publicationId);
    void deleteByPublicationId(Long publicationId);
    void deleteByUserId(Long userId);
    long countByPublicationIdAndRole(Long publicationId, String role);
}
