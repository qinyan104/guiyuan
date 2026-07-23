package com.genealogy.server.dto;

import java.time.LocalDateTime;

public class BookDocumentResponse {
    private Long id;
    private Long publicationId;
    private String title;
    private String documentJson;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPublicationId() { return publicationId; }
    public void setPublicationId(Long publicationId) { this.publicationId = publicationId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDocumentJson() { return documentJson; }
    public void setDocumentJson(String documentJson) { this.documentJson = documentJson; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
