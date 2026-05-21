package com.genealogy.server.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "book_person_details")
public class BookPersonDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "draft_id", nullable = false)
    private Long draftId;

    @Column(name = "person_id", nullable = false, length = 50)
    private String personId;

    @Column(columnDefinition = "TEXT")
    private String biography;

    @Column(name = "interlinear_notes", columnDefinition = "JSON")
    private String interlinearNotes;

    @Column(name = "seal_style", length = 50)
    private String sealStyle;

    @Column(name = "user_modified", nullable = false)
    private Boolean userModified = false;

    @Column(name = "source_fields_hash", length = 32)
    private String sourceFieldsHash;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDraftId() { return draftId; }
    public void setDraftId(Long draftId) { this.draftId = draftId; }
    public String getPersonId() { return personId; }
    public void setPersonId(String personId) { this.personId = personId; }
    public String getBiography() { return biography; }
    public void setBiography(String biography) { this.biography = biography; }
    public String getInterlinearNotes() { return interlinearNotes; }
    public void setInterlinearNotes(String interlinearNotes) { this.interlinearNotes = interlinearNotes; }
    public String getSealStyle() { return sealStyle; }
    public void setSealStyle(String sealStyle) { this.sealStyle = sealStyle; }
    public Boolean getUserModified() { return userModified; }
    public void setUserModified(Boolean userModified) { this.userModified = userModified; }
    public String getSourceFieldsHash() { return sourceFieldsHash; }
    public void setSourceFieldsHash(String sourceFieldsHash) { this.sourceFieldsHash = sourceFieldsHash; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
