package com.genealogy.server.repository;

import com.genealogy.server.model.FamilyMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Long> {
    List<FamilyMember> findByFamilyDbIdOrderBySortOrder(Long familyDbId);
    List<FamilyMember> findByPersonDbId(Long personDbId);
    @Modifying
    @Transactional
    @Query("DELETE FROM FamilyMember fm WHERE fm.familyDbId = :familyDbId")
    void deleteByFamilyDbId(@Param("familyDbId") Long familyDbId);
}
