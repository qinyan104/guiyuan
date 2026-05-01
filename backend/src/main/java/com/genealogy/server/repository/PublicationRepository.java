package com.genealogy.server.repository;

import com.genealogy.server.model.Publication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PublicationRepository extends JpaRepository<Publication, Long> {
    List<Publication> findByUserIdOrderByUpdatedAtDesc(Long userId);
}
