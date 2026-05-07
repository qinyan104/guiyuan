package com.genealogy.server.dto;

public class PersonDTO {
    private String personId;
    private String name;
    private String gender;
    private String birthday;
    private String deathday;
    private String birthplace;
    private String residence;
    private String biography;
    private String photoUrl;
    private String photoBase64;
    private Boolean deceased;
    private String age;
    private String titleName;
    private String clan;
    private String note;
    private String highlightRole;
    private Long photoId;
    private Boolean isMountPoint;
    private Long targetPublicationId;
    private Long targetRootPersonId;

    // Getters and Setters
    public String getPersonId() { return personId; }
    public void setPersonId(String personId) { this.personId = personId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getBirthday() { return birthday; }
    public void setBirthday(String birthday) { this.birthday = birthday; }

    public String getDeathday() { return deathday; }
    public void setDeathday(String deathday) { this.deathday = deathday; }

    public String getBirthplace() { return birthplace; }
    public void setBirthplace(String birthplace) { this.birthplace = birthplace; }

    public String getResidence() { return residence; }
    public void setResidence(String residence) { this.residence = residence; }

    public String getBiography() { return biography; }
    public void setBiography(String biography) { this.biography = biography; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getPhotoBase64() { return photoBase64; }
    public void setPhotoBase64(String photoBase64) { this.photoBase64 = photoBase64; }

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

    public Boolean getIsMountPoint() { return isMountPoint; }
    public void setIsMountPoint(Boolean isMountPoint) { this.isMountPoint = isMountPoint; }

    public Long getTargetPublicationId() { return targetPublicationId; }
    public void setTargetPublicationId(Long targetPublicationId) { this.targetPublicationId = targetPublicationId; }

    public Long getTargetRootPersonId() { return targetRootPersonId; }
    public void setTargetRootPersonId(Long targetRootPersonId) { this.targetRootPersonId = targetRootPersonId; }
}
