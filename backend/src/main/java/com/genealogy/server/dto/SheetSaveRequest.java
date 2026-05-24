package com.genealogy.server.dto;

import java.util.List;

public class SheetSaveRequest {
    private Integer sheetNumber;
    private String sheetType = "genealogy";
    private String layoutData; // JSON string

    public Integer getSheetNumber() { return sheetNumber; }
    public void setSheetNumber(Integer sheetNumber) { this.sheetNumber = sheetNumber; }
    public String getSheetType() { return sheetType; }
    public void setSheetType(String sheetType) { this.sheetType = sheetType; }
    public String getLayoutData() { return layoutData; }
    public void setLayoutData(String layoutData) { this.layoutData = layoutData; }
}
