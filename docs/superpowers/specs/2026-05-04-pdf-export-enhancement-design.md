# Spec: Single-Page Vector PDF Export Enhancement

**Status**: Implemented (2026-05-04)
**Context**: Replaces legacy high-resolution PNG export with a vector-based PDF for infinite scalability and professional printing.

## 1. Problem Statement
Large genealogies rendered as PNGs consume excessive server/client memory and lose quality when zoomed. Users need a "continuous paper" style export that maintains vector crispness across all zoom levels.

## 2. Technical Architecture

### 2.1 Backend Implementation (`PdfExportService`)
- **Library**: iText 7 (with `svg` module).
- **Endpoint**: `POST /api/publications/{id}/export/pdf/single-page`.
- **Logic**:
    - **SVG Pre-processing**: Inlines all `/api/photos/{id}` URLs as Base64 data URLs to ensure the PDF generator can access images without secondary HTTP requests.
    - **Dynamic Sizing**: Calculates PDF page dimensions based on the provided SVG width/height.
    - **Scaling Protection**: iText and PDF readers have a maximum page edge limit of ~14400pt. If the tree exceeds this, the service automatically scales the entire document down to fit within safe bounds while maintaining aspect ratio.
    - **Font Injection**: Injects system fonts (e.g., Microsoft YaHei, SimSun, PingFang) into the SVG rendering pipeline to support CJK characters.

### 2.2 Frontend Implementation (`WorkbenchHeader.vue` & `publicationExport.ts`)
- **Capture**: Serializes the `PublicationCanvas.vue` SVG markup.
- **Diagnostics**: Added detailed error capture for SVG serialization failures.
- **Fallback**: Retains the "Print Lab" (multi-page A4) as a secondary option for document-style output.

## 3. Deployment Requirements
- **Server Fonts**: The server must have CJK-compatible fonts installed. The service checks the following paths:
    - `C:/Windows/Fonts/msyh.ttc` (Windows)
    - `/System/Library/Fonts/PingFang.ttc` (macOS)
    - `/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc` (Linux)

## 4. Key Improvements
- **O(1) Image Access**: Photos are resolved directly from the database during PDF generation.
- **Zero Loss**: Full vector path preservation.
- **Hardware Acceleration**: Backend SVG-to-PDF conversion is significantly faster than browser-side PNG rendering for large trees.
