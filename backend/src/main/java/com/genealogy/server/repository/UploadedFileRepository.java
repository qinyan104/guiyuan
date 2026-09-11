package com.genealogy.server.repository;

import com.genealogy.server.model.UploadedFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UploadedFileRepository extends JpaRepository<UploadedFile, Long> {
    Optional<UploadedFile> findByStorageKey(String storageKey);
}
