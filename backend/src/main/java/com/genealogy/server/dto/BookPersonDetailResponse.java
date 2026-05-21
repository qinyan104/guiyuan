package com.genealogy.server.dto;

import java.time.LocalDateTime;

public class BookPersonDetailResponse {

    private Long id;
    private String personId;
    private String personName;
    private String biography;
    private String interlinearNotes;
    private String sealStyle;
    private Boolean userModified;
    private String sourceFieldsHash;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getPersonId() { return personId; }
    public void setPersonId(String personId) { this.personId = personId; }
    public String getPersonName() { return personName; }
    public void setPersonName(String personName) { this.personName = personName; }
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
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
