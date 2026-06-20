package com.genealogy.server.gedcom;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.AuditLogService;
import com.genealogy.server.service.PublicationAuthorizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * GEDCOM 导入/导出 REST 端点
 */
@RestController
@Tag(name = "GEDCOM", description = "GEDCOM 5.5 格式导入/导出")
public class GedcomController {

    private static final Logger log = LoggerFactory.getLogger(GedcomController.class);

    private final GedcomImportService importService;
    private final GedcomExportService exportService;
    private final UserRepository userRepository;
    private final PublicationAuthorizationService authorizationService;
    private final AuditLogService auditLogService;

    public GedcomController(GedcomImportService importService,
                            GedcomExportService exportService,
                            UserRepository userRepository,
                            PublicationAuthorizationService authorizationService,
                            AuditLogService auditLogService) {
        this.importService = importService;
        this.exportService = exportService;
        this.userRepository = userRepository;
        this.authorizationService = authorizationService;
        this.auditLogService = auditLogService;
    }

    private UserSubject resolveSubject(HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        if (username == null) throw new RuntimeException("用户不存在");
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        return new UserSubject(user.getId(), user.getRole(), user.getUsername());
    }

    /**
     * 导出族谱为 GEDCOM 文件
     * GET /api/publications/{pubId}/gedcom
     */
    @Operation(summary = "导出 GEDCOM", description = "将族谱导出为 GEDCOM 5.5 格式文件")
    @GetMapping("/api/publications/{pubId}/gedcom")
    public void exportGedcom(
            @Parameter(description = "族谱ID") @PathVariable Long pubId,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {

        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, pubId, AccessPermission.READ_FULL);

        response.setContentType("text/plain; charset=UTF-8");
        response.setHeader("Content-Disposition",
            "attachment; filename=\"family-" + pubId + ".ged\"");

        exportService.export(pubId, response.getOutputStream());

        auditLogService.record(subject.getUsername(), "GEDCOM_EXPORT",
            "导出 GEDCOM 文件", pubId);
    }

    /**
     * 导入 GEDCOM 文件为新族谱
     * POST /api/publications/import
     */
    @Operation(summary = "导入 GEDCOM", description = "从 GEDCOM 文件创建新族谱")
    @PostMapping("/api/publications/import")
    public ApiResponse<Map<String, Object>> importGedcom(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) throws IOException {

        UserSubject subject = resolveSubject(request);

        if (file.isEmpty()) {
            return ApiResponse.error(400, "请上传 GEDCOM 文件");
        }

        String filename = file.getOriginalFilename();
        if (filename != null && !filename.toLowerCase().endsWith(".ged")) {
            return ApiResponse.error(400, "仅支持 .ged 格式的文件");
        }

        Long userId = subject.getUserId();
        GedcomImportService.ImportResult result = importService.importAsNewPublication(
            file.getInputStream(), userId);

        auditLogService.record(subject.getUsername(), "GEDCOM_IMPORT",
            String.format("导入 GEDCOM 文件：%d 人, %d 家庭", result.personCount(), result.familyCount()),
            result.pubId());

        return ApiResponse.success("GEDCOM 导入成功", Map.of(
            "pubId", result.pubId(),
            "personCount", result.personCount(),
            "familyCount", result.familyCount(),
            "warnings", result.warnings()
        ));
    }

    /**
     * 合并导入 GEDCOM 到现有族谱
     * POST /api/publications/{pubId}/gedcom/merge
     */
    @Operation(summary = "合并 GEDCOM", description = "将 GEDCOM 文件合并到现有族谱")
    @PostMapping("/api/publications/{pubId}/gedcom/merge")
    public ApiResponse<Map<String, Object>> mergeGedcom(
            @Parameter(description = "族谱ID") @PathVariable Long pubId,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) throws IOException {

        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, pubId, AccessPermission.EDIT);

        if (file.isEmpty()) {
            return ApiResponse.error(400, "请上传 GEDCOM 文件");
        }

        GedcomImportService.ImportResult result = importService.mergeIntoPublication(
            file.getInputStream(), pubId);

        auditLogService.record(subject.getUsername(), "GEDCOM_MERGE",
            String.format("合并 GEDCOM 文件：新增 %d 人, %d 家庭", result.personCount(), result.familyCount()),
            pubId);

        return ApiResponse.success("GEDCOM 合并成功", Map.of(
            "pubId", result.pubId(),
            "newPersons", result.personCount(),
            "newFamilies", result.familyCount(),
            "warnings", result.warnings()
        ));
    }
}
