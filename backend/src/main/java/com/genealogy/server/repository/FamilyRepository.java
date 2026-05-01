package com.genealogy.server.repository;

import com.genealogy.server.model.Family;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface FamilyRepository extends JpaRepository<Family, Long> {
    List<Family> findByPublicationId(Long publicationId);
    Optional<Family> findByPublicationIdAndFamilyId(Long publicationId, String familyId);
    @Modifying
    @Transactional
    @Query("DELETE FROM Family f WHERE f.publicationId = :publicationId")
    void deleteByPublicationId(@Param("publicationId") Long publicationId);
}
