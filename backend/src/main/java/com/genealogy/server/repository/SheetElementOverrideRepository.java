package com.genealogy.server.repository;

import com.genealogy.server.model.SheetElementOverride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SheetElementOverrideRepository extends JpaRepository<SheetElementOverride, Long> {
    List<SheetElementOverride> findBySheetId(Long sheetId);
    void deleteBySheetId(Long sheetId);
}
