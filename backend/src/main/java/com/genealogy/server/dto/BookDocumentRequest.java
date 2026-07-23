package com.genealogy.server.dto;

public class BookDocumentRequest {
    private String title;
    private String documentJson;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDocumentJson() { return documentJson; }
    public void setDocumentJson(String documentJson) { this.documentJson = documentJson; }
}
