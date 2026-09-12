package com.genealogy.server.repository;

import com.genealogy.server.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    List<User> findByUsernameContainingIgnoreCaseOrNicknameContainingIgnoreCase(String username, String nickname);
    Page<User> findByUsernameContainingIgnoreCaseOrNicknameContainingIgnoreCase(String username, String nickname, Pageable pageable);
    Page<User> findByRole(String role, Pageable pageable);
    @Query("SELECT u FROM User u WHERE u.role = :role AND (LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(COALESCE(u.nickname, '')) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<User> findByRoleAndQuery(@Param("role") String role, @Param("query") String query, Pageable pageable);
}
