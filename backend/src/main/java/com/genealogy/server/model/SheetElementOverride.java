package com.genealogy.server.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "sheet_element_overrides")
public class SheetElementOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sheet_id", nullable = false)
    private Long sheetId;

    @Column(name = "element_key", nullable = false, length = 64)
    private String elementKey;

    @Column(name = "override_x", precision = 10, scale = 2)
    private BigDecimal overrideX;

    @Column(name = "override_y", precision = 10, scale = 2)
    private BigDecimal overrideY;

    @Column(name = "override_scale", precision = 3, scale = 2)
    private BigDecimal overrideScale = new BigDecimal("1.00");

    @Column(name = "override_visible")
    private Boolean overrideVisible;

    @Column(name = "is_manual", nullable = false)
    private Boolean isManual = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSheetId() { return sheetId; }
    public void setSheetId(Long sheetId) { this.sheetId = sheetId; }
    public String getElementKey() { return elementKey; }
    public void setElementKey(String elementKey) { this.elementKey = elementKey; }
    public BigDecimal getOverrideX() { return overrideX; }
    public void setOverrideX(BigDecimal overrideX) { this.overrideX = overrideX; }
    public BigDecimal getOverrideY() { return overrideY; }
    public void setOverrideY(BigDecimal overrideY) { this.overrideY = overrideY; }
    public BigDecimal getOverrideScale() { return overrideScale; }
    public void setOverrideScale(BigDecimal overrideScale) { this.overrideScale = overrideScale; }
    public Boolean getOverrideVisible() { return overrideVisible; }
    public void setOverrideVisible(Boolean overrideVisible) { this.overrideVisible = overrideVisible; }
    public Boolean getIsManual() { return isManual; }
    public void setIsManual(Boolean isManual) { this.isManual = isManual; }
}
