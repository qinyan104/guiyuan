package com.genealogy.server.repository;

import com.genealogy.server.model.Photo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PhotoRepository extends JpaRepository<Photo, Long> {
    Optional<Photo> findByPersonDbId(Long personDbId);
    void deleteByPersonDbId(Long personDbId);
}
