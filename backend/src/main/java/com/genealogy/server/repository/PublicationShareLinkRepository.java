package com.genealogy.server.repository;

import com.genealogy.server.model.PublicationShareLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PublicationShareLinkRepository extends JpaRepository<PublicationShareLink, Long> {
    Optional<PublicationShareLink> findByTokenHash(String tokenHash);
    List<PublicationShareLink> findByPublicationIdOrderByCreatedAtDesc(Long publicationId);
    long countByPublicationIdAndStatus(Long publicationId, String status);
    void deleteByPublicationId(Long publicationId);
}
