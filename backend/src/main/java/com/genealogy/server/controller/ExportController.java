package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.PdfExportRequest;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
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
    private final PublicationAuthorizationService authorizationService;
    private final UserRepository userRepository;

    public ExportController(PdfExportService pdfExportService,
                            PublicationAuthorizationService authorizationService,
                            UserRepository userRepository) {
        this.pdfExportService = pdfExportService;
        this.authorizationService = authorizationService;
        this.userRepository = userRepository;
    }

    @PostMapping("/pdf")
    public ResponseEntity<byte[]> exportPdf(@PathVariable Long id, @RequestBody PdfExportRequest request, HttpServletRequest servletRequest) {
        UserSubject subject = resolveSubject(servletRequest);
        authorizationService.require(subject, id, AccessPermission.EXPORT_FULL);
        byte[] pdfBytes = pdfExportService.generateGenealogyBook(String.valueOf(id), request, resolveBaseUri(servletRequest));
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "genealogy-book-" + id + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    @PostMapping("/pdf/single-page")
    public ResponseEntity<byte[]> exportSinglePagePdf(@PathVariable Long id, @RequestBody PdfExportRequest request, HttpServletRequest servletRequest) {
        UserSubject subject = resolveSubject(servletRequest);
        authorizationService.require(subject, id, AccessPermission.EXPORT_FULL);
        byte[] pdfBytes = pdfExportService.generateSinglePageSvgPdf(request, resolveBaseUri(servletRequest));
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "genealogy-tree-" + id + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    private UserSubject resolveSubject(HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        return new UserSubject(user.getId(), user.getRole(), username);
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
