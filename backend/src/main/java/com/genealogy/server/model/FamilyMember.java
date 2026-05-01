package com.genealogy.server.model;

import jakarta.persistence.*;

@Entity
@Table(name = "family_members")
public class FamilyMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "family_db_id", nullable = false)
    private Long familyDbId;

    @Column(name = "person_db_id", nullable = false)
    private Long personDbId;

    @Column(nullable = false, length = 10)
    private String role; // "adult" or "child"

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getFamilyDbId() { return familyDbId; }
    public void setFamilyDbId(Long familyDbId) { this.familyDbId = familyDbId; }
    public Long getPersonDbId() { return personDbId; }
    public void setPersonDbId(Long personDbId) { this.personDbId = personDbId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
