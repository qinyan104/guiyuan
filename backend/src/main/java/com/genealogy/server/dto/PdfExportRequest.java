package com.genealogy.server.dto;

public class PdfExportRequest {
    private String base64Image;
    private String svgMarkup;
    private String prefaceText;
    private String biosText;
    private String title;
    private boolean includeBios;
    private float imageScale = 1.0f;
    private Float pdfWidth;
    private Float pdfHeight;

    public String getBase64Image() { return base64Image; }
    public void setBase64Image(String base64Image) { this.base64Image = base64Image; }

    public String getSvgMarkup() { return svgMarkup; }
    public void setSvgMarkup(String svgMarkup) { this.svgMarkup = svgMarkup; }

    public String getPrefaceText() { return prefaceText; }
    public void setPrefaceText(String prefaceText) { this.prefaceText = prefaceText; }

    public String getBiosText() { return biosText; }
    public void setBiosText(String biosText) { this.biosText = biosText; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public boolean isIncludeBios() { return includeBios; }
    public void setIncludeBios(boolean includeBios) { this.includeBios = includeBios; }

    public float getImageScale() { return imageScale; }
    public void setImageScale(float imageScale) { this.imageScale = imageScale; }

    public Float getPdfWidth() { return pdfWidth; }
    public void setPdfWidth(Float pdfWidth) { this.pdfWidth = pdfWidth; }

    public Float getPdfHeight() { return pdfHeight; }
    public void setPdfHeight(Float pdfHeight) { this.pdfHeight = pdfHeight; }
}
