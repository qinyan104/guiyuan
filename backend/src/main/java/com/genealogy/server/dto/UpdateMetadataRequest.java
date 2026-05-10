package com.genealogy.server.dto;

import java.util.Map;

public class UpdateMetadataRequest {
    private String title;
    private String subtitle;
    private Long revision;
    private Map<String, Object> info;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSubtitle() { return subtitle; }
    public void setSubtitle(String subtitle) { this.subtitle = subtitle; }
    public Long getRevision() { return revision; }
    public void setRevision(Long revision) { this.revision = revision; }
    public Map<String, Object> getInfo() { return info; }
    public void setInfo(Map<String, Object> info) { this.info = info; }
}
