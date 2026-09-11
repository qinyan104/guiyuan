package com.genealogy.server.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "uploaded_files")
public class UploadedFile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "storage_key", nullable = false, unique = true, length = 255)
    private String storageKey;
    @Column(name = "original_name", length = 255)
    private String originalName;
    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;
    @Column(nullable = false)
    private Long size;
    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;
    @Column(name = "publication_id")
    private Long publicationId;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); }
    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public String getStorageKey() { return storageKey; } public void setStorageKey(String v) { storageKey = v; }
    public String getOriginalName() { return originalName; } public void setOriginalName(String v) { originalName = v; }
    public String getMimeType() { return mimeType; } public void setMimeType(String v) { mimeType = v; }
    public Long getSize() { return size; } public void setSize(Long v) { size = v; }
    public Long getOwnerUserId() { return ownerUserId; } public void setOwnerUserId(Long v) { ownerUserId = v; }
    public Long getPublicationId() { return publicationId; } public void setPublicationId(Long v) { publicationId = v; }
    public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { createdAt = v; }
}
