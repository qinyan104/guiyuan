package com.genealogy.server.repository;

import com.genealogy.server.model.PersonAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PersonAccountRepository extends JpaRepository<PersonAccount, Long> {
    List<PersonAccount> findByPublicationId(Long publicationId);
    Optional<PersonAccount> findByPersonDbId(Long personDbId);
    Optional<PersonAccount> findByUserId(Long userId);
    boolean existsByPersonDbId(Long personDbId);
    void deleteByPersonDbId(Long personDbId);
}
