package com.genealogy.server.dto;

public class BranchMountDTO {
    private Long id;
    private Long publicationId;
    private String personId;
    private Long targetPublicationId;
    private Long targetRootPersonId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPublicationId() { return publicationId; }
    public void setPublicationId(Long publicationId) { this.publicationId = publicationId; }

    public String getPersonId() { return personId; }
    public void setPersonId(String personId) { this.personId = personId; }

    public Long getTargetPublicationId() { return targetPublicationId; }
    public void setTargetPublicationId(Long targetPublicationId) { this.targetPublicationId = targetPublicationId; }

    public Long getTargetRootPersonId() { return targetRootPersonId; }
    public void setTargetRootPersonId(Long targetRootPersonId) { this.targetRootPersonId = targetRootPersonId; }
}
