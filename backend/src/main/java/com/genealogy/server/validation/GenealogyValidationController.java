package com.genealogy.server.validation;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 智能校验 REST 端点
 */
@RestController
@RequestMapping("/api/publications/{pubId}/validation")
@Tag(name = "校验", description = "族谱数据质量校验")
public class GenealogyValidationController {

    private final GenealogyValidationEngine engine;
    private final UserRepository userRepository;
    private final PublicationAuthorizationService authorizationService;

    public GenealogyValidationController(GenealogyValidationEngine engine,
                                          UserRepository userRepository,
                                          PublicationAuthorizationService authorizationService) {
        this.engine = engine;
        this.userRepository = userRepository;
        this.authorizationService = authorizationService;
    }

    private UserSubject resolveSubject(HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        if (username == null) throw new RuntimeException("用户不存在");
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        return new UserSubject(user.getId(), user.getRole(), user.getUsername());
    }

    /**
     * 全量校验
     * GET /api/publications/{pubId}/validation
     */
    @Operation(summary = "全量校验", description = "运行所有校验规则，返回校验发现列表")
    @GetMapping
    public ApiResponse<List<ValidationFinding>> validate(
            @Parameter(description = "族谱ID") @PathVariable Long pubId,
            HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, pubId, AccessPermission.READ_FULL);
        return ApiResponse.success(engine.validate(pubId));
    }

    /**
     * 校验统计摘要
     * GET /api/publications/{pubId}/validation/summary
     */
    @Operation(summary = "校验摘要", description = "返回校验问题的数量统计")
    @GetMapping("/summary")
    public ApiResponse<Map<String, Object>> summary(
            @Parameter(description = "族谱ID") @PathVariable Long pubId,
            HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, pubId, AccessPermission.READ_FULL);
        return ApiResponse.success(engine.getSummary(pubId));
    }

    /**
     * 实时校验（单人）
     * GET /api/publications/{pubId}/validation/person/{personId}
     */
    @Operation(summary = "单人校验", description = "只运行与指定人物相关的校验规则")
    @GetMapping("/person/{personId}")
    public ApiResponse<List<ValidationFinding>> validatePerson(
            @Parameter(description = "族谱ID") @PathVariable Long pubId,
            @Parameter(description = "人物ID") @PathVariable String personId,
            HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, pubId, AccessPermission.READ_FULL);
        return ApiResponse.success(engine.validatePerson(pubId, personId));
    }

    /**
     * 规则列表
     * GET /api/publications/{pubId}/validation/rules
     */
    @Operation(summary = "规则列表", description = "返回所有已注册的校验规则")
    @GetMapping("/rules")
    public ApiResponse<List<Map<String, Object>>> listRules(
            @Parameter(description = "族谱ID") @PathVariable Long pubId,
            HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, pubId, AccessPermission.READ_FULL);
        return ApiResponse.success(engine.listRules());
    }
}
