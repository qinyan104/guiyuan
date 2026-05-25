package com.genealogy.server.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity
@Table(name = "book_drafts")
public class BookDraft {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "publication_id", nullable = false)
    private Long publicationId;

    @Column(nullable = false, length = 200)
    private String title = "未命名草稿";

    @Column(length = 200)
    private String subtitle = "";

    @Column(columnDefinition = "TEXT")
    private String preface;

    @Column(columnDefinition = "TEXT")
    private String epilogue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "style_config", columnDefinition = "JSON")
    private String styleConfig;

    @Column(length = 20)
    private String status = "draft";

    @Column(nullable = false)
    private Integer version = 1;

    @Column(name = "snapshot_revision", nullable = false)
    private Long snapshotRevision = 0L;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_by")
    private Long updatedBy;

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
    public Long getPublicationId() { return publicationId; }
    public void setPublicationId(Long publicationId) { this.publicationId = publicationId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSubtitle() { return subtitle; }
    public void setSubtitle(String subtitle) { this.subtitle = subtitle; }
    public String getPreface() { return preface; }
    public void setPreface(String preface) { this.preface = preface; }
    public String getEpilogue() { return epilogue; }
    public void setEpilogue(String epilogue) { this.epilogue = epilogue; }
    public String getStyleConfig() { return styleConfig; }
    public void setStyleConfig(String styleConfig) { this.styleConfig = styleConfig; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
    public Long getSnapshotRevision() { return snapshotRevision; }
    public void setSnapshotRevision(Long snapshotRevision) { this.snapshotRevision = snapshotRevision; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
