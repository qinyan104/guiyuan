package com.genealogy.server.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class BookDraftRequest {

    @NotNull(message = "族谱ID不能为空")
    private Long publicationId;

    @NotBlank(message = "标题不能为空")
    private String title;

    private String subtitle;
    private String preface;
    private String epilogue;
    private String styleConfig;

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
}
