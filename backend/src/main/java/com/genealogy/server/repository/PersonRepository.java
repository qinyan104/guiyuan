package com.genealogy.server.repository;

import com.genealogy.server.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PersonRepository extends JpaRepository<Person, Long> {
    List<Person> findByPublicationId(Long publicationId);
    Optional<Person> findByPublicationIdAndPersonId(Long publicationId, String personId);

    @Query("SELECT p FROM Person p WHERE p.publicationId IN :pubIds AND LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Person> searchByNameInPublications(@Param("pubIds") Collection<Long> pubIds, @Param("query") String query);

    @Modifying
    @Transactional
    @Query("DELETE FROM Person p WHERE p.publicationId = :publicationId")
    void deleteByPublicationId(@Param("publicationId") Long publicationId);
}
