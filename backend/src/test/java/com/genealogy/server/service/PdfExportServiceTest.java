package com.genealogy.server.service;

import com.genealogy.server.dto.PdfExportRequest;
import com.genealogy.server.model.Photo;
import com.genealogy.server.repository.PhotoRepository;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.ByteArrayInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class PdfExportServiceTest {

    @Test
    void generateSinglePageSvgPdf_scalesOversizedPagesIntoSafePdfBounds() throws Exception {
        PdfExportService service = new PdfExportService();
        PdfExportRequest request = new PdfExportRequest();
        request.setSvgMarkup("""
                <svg xmlns="http://www.w3.org/2000/svg" width="50000" height="24000" viewBox="0 0 50000 24000">
                  <rect width="50000" height="24000" fill="#fffaf0"/>
                  <text x="1200" y="2400" font-size="1600">Genealogy</text>
                </svg>
                """);
        request.setPdfWidth(37500f);
        request.setPdfHeight(18000f);

        byte[] pdfBytes = service.generateSinglePageSvgPdf(request);

        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            Rectangle mediaBox = pdf.getFirstPage().getMediaBox();
            assertThat(pdf.getNumberOfPages()).isEqualTo(1);
            assertThat(mediaBox.getWidth()).isLessThanOrEqualTo(14400f);
            assertThat(mediaBox.getHeight()).isLessThanOrEqualTo(14400f);
            assertThat(mediaBox.getWidth() / mediaBox.getHeight()).isCloseTo(37500f / 18000f, within(0.01f));
        }
    }

    @Test
    void generateSinglePageSvgPdf_supportsEmbeddedDataUrlImages() throws Exception {
        PdfExportService service = new PdfExportService();
        PdfExportRequest request = new PdfExportRequest();
        request.setSvgMarkup("""
                <?xml version="1.0" encoding="UTF-8"?>
                <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
                  <defs>
                    <clipPath id="avatar-clip">
                      <circle cx="220" cy="260" r="90"/>
                    </clipPath>
                  </defs>
                  <rect width="1200" height="800" fill="#fffaf0"/>
                  <text x="120" y="110" font-size="56" fill="#241a10">Embedded Image</text>
                  <image
                    href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+KDvS6QAAAABJRU5ErkJggg=="
                    x="130"
                    y="170"
                    width="180"
                    height="180"
                    preserveAspectRatio="xMidYMid meet"
                    clip-path="url(#avatar-clip)"
                  />
                </svg>
                """);
        request.setPdfWidth(900f);
        request.setPdfHeight(600f);

        byte[] pdfBytes = service.generateSinglePageSvgPdf(request);

        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            assertThat(pdf.getNumberOfPages()).isEqualTo(1);
            assertThat(pdfBytes.length).isGreaterThan(0);
        }
    }

    @Test
    void inlinePhotoUrls_replacesApiPhotoUrlsWithDataUrls() {
        PhotoRepository photoRepository = Mockito.mock(PhotoRepository.class);
        Photo photo = new Photo();
        photo.setMimeType("image/png");
        photo.setData(new byte[]{1, 2, 3, 4});
        Mockito.when(photoRepository.findById(42L)).thenReturn(java.util.Optional.of(photo));

        PdfExportService service = new PdfExportService(photoRepository);
        String result = service.inlinePhotoUrls("""
                <svg xmlns="http://www.w3.org/2000/svg">
                  <image href="/api/photos/42" xlink:href="/api/photos/42" />
                </svg>
                """);

        assertThat(result).contains("data:image/png;base64,AQIDBA==");
        assertThat(result).doesNotContain("/api/photos/42");
    }
}
