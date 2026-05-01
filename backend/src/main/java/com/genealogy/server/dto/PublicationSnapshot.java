package com.genealogy.server.dto;

import java.util.Map;

public class PublicationSnapshot {
    private String title;
    private String subtitle;
    private Map<String, Object> publication;
    private Map<String, Object> settings;
    private Map<String, Object> info;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSubtitle() { return subtitle; }
    public void setSubtitle(String subtitle) { this.subtitle = subtitle; }
    public Map<String, Object> getPublication() { return publication; }
    public void setPublication(Map<String, Object> publication) { this.publication = publication; }
    public Map<String, Object> getSettings() { return settings; }
    public void setSettings(Map<String, Object> settings) { this.settings = settings; }
    public Map<String, Object> getInfo() { return info; }
    public void setInfo(Map<String, Object> info) { this.info = info; }
}
