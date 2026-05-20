package com.genealogy.server.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "person_accounts", uniqueConstraints = {
    @UniqueConstraint(columnNames = "person_db_id"),
    @UniqueConstraint(columnNames = "user_id")
})
public class PersonAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "person_db_id", nullable = false, unique = true)
    private Long personDbId;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "publication_id", nullable = false)
    private Long publicationId;

    @Column(nullable = false, length = 20)
    private String status = "active";

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPersonDbId() { return personDbId; }
    public void setPersonDbId(Long personDbId) { this.personDbId = personDbId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getPublicationId() { return publicationId; }
    public void setPublicationId(Long publicationId) { this.publicationId = publicationId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
