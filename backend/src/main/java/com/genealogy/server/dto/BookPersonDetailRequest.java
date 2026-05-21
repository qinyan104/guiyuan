package com.genealogy.server.dto;

import jakarta.validation.constraints.NotBlank;

public class BookPersonDetailRequest {

    @NotBlank(message = "人物ID不能为空")
    private String personId;

    private String biography;
    private String interlinearNotes;
    private String sealStyle;
    private Boolean userModified;

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
}
