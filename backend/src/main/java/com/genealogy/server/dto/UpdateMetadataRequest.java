package com.genealogy.server.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.Map;

public class UpdateMetadataRequest {
    @Size(max = 200, message = "族谱标题不能超过 200 个字符")
    private String title;
    @Size(max = 500, message = "族谱副标题不能超过 500 个字符")
    private String subtitle;
    @Min(value = 0, message = "版本号不能小于 0")
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
