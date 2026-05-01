package com.genealogy.server.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "persons", uniqueConstraints = @UniqueConstraint(columnNames = {"publication_id", "person_id"}))
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "publication_id", nullable = false)
    private Long publicationId;

    @Column(name = "person_id", nullable = false, length = 20)
    private String personId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 10)
    private String gender = "unknown";

    @Column(length = 50)
    private String birth;

    @Column(length = 50)
    private String death;

    @Column
    private Boolean deceased = false;

    @Column(length = 20)
    private String age;

    @Column(name = "title_name", length = 100)
    private String titleName;

    @Column(length = 100)
    private String clan;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "highlight_role", length = 20)
    private String highlightRole;

    @Column(name = "photo_id")
    private Long photoId;

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
    public String getPersonId() { return personId; }
    public void setPersonId(String personId) { this.personId = personId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getBirth() { return birth; }
    public void setBirth(String birth) { this.birth = birth; }
    public String getDeath() { return death; }
    public void setDeath(String death) { this.death = death; }
    public Boolean getDeceased() { return deceased; }
    public void setDeceased(Boolean deceased) { this.deceased = deceased; }
    public String getAge() { return age; }
    public void setAge(String age) { this.age = age; }
    public String getTitleName() { return titleName; }
    public void setTitleName(String titleName) { this.titleName = titleName; }
    public String getClan() { return clan; }
    public void setClan(String clan) { this.clan = clan; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getHighlightRole() { return highlightRole; }
    public void setHighlightRole(String highlightRole) { this.highlightRole = highlightRole; }
    public Long getPhotoId() { return photoId; }
    public void setPhotoId(Long photoId) { this.photoId = photoId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
