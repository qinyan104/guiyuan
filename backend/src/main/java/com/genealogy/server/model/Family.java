package com.genealogy.server.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "families", uniqueConstraints = @UniqueConstraint(columnNames = {"publication_id", "family_id"}))
public class Family {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "publication_id", nullable = false)
    private Long publicationId;

    @Column(name = "family_id", nullable = false, length = 20)
    private String familyId;

    @Column(name = "branch_mode", length = 20)
    private String branchMode;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPublicationId() { return publicationId; }
    public void setPublicationId(Long publicationId) { this.publicationId = publicationId; }
    public String getFamilyId() { return familyId; }
    public void setFamilyId(String familyId) { this.familyId = familyId; }
    public String getBranchMode() { return branchMode; }
    public void setBranchMode(String branchMode) { this.branchMode = branchMode; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
