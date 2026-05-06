package com.genealogy.server.controller;

import com.genealogy.server.dto.PdfExportRequest;
import com.genealogy.server.service.PdfExportService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/publications/{id}/export")
public class ExportController {

    private final PdfExportService pdfExportService;

    public ExportController(PdfExportService pdfExportService) {
        this.pdfExportService = pdfExportService;
    }

    @PostMapping("/pdf")
    public ResponseEntity<byte[]> exportPdf(@PathVariable String id, @RequestBody PdfExportRequest request, HttpServletRequest servletRequest) {
        byte[] pdfBytes = pdfExportService.generateGenealogyBook(id, request, resolveBaseUri(servletRequest));
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "genealogy-book-" + id + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    @PostMapping("/pdf/single-page")
    public ResponseEntity<byte[]> exportSinglePagePdf(@PathVariable String id, @RequestBody PdfExportRequest request, HttpServletRequest servletRequest) {
        byte[] pdfBytes = pdfExportService.generateSinglePageSvgPdf(request, resolveBaseUri(servletRequest));
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "genealogy-tree-" + id + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    private String resolveBaseUri(HttpServletRequest request) {
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();
        boolean defaultPort = ("http".equalsIgnoreCase(scheme) && serverPort == 80)
                || ("https".equalsIgnoreCase(scheme) && serverPort == 443);

        return defaultPort
                ? scheme + "://" + serverName
                : scheme + "://" + serverName + ":" + serverPort;
    }
}
