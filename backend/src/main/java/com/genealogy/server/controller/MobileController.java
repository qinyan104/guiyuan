package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.model.PublicationShareLink;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.AuditLogService;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import com.genealogy.server.service.RefreshTokenService;
import com.genealogy.server.service.ShareLinkService;
import com.genealogy.server.service.UserService;
import com.genealogy.server.auth.ShareSubject;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.exception.ForbiddenException;
import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * 小程序专用 API 端点
 */
@RestController
@RequestMapping("/api/mobile")
@Tag(name = "小程序", description = "微信小程序专用接口")
public class MobileController {

    private static final Logger log = LoggerFactory.getLogger(MobileController.class);

    @Value("${guiyuan.wechat.appid:}")
    private String wechatAppId;

    @Value("${guiyuan.wechat.secret:}")
    private String wechatSecret;

    @Value("${guiyuan.wechat.allow-mock:false}")
    private boolean allowMock;

    private final UserService userService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final UserRepository userRepository;
    private final PublicationService publicationService;
    private final AuditLogService auditLogService;
    private final PublicationAuthorizationService authorizationService;
    private final ShareLinkService shareLinkService;

    public MobileController(UserService userService, JwtService jwtService,
                            RefreshTokenService refreshTokenService,
                            UserRepository userRepository, PublicationService publicationService,
                            AuditLogService auditLogService, PublicationAuthorizationService authorizationService,
                            ShareLinkService shareLinkService) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.userRepository = userRepository;
        this.publicationService = publicationService;
        this.auditLogService = auditLogService;
        this.authorizationService = authorizationService;
        this.shareLinkService = shareLinkService;
    }

    /**
     * 微信登录
     * POST /api/mobile/auth/wechat-login
     *
     * 流程：
     * 1. 前端调用 wx.login() 获取 code
     * 2. 后端用 code 向微信服务器换取 openid + session_key
     * 3. 查找或创建用户（username = "wx_" + openid）
     * 4. 生成 JWT
     */
    @Operation(summary = "微信登录", description = "使用微信 code 登录或注册")
    @PostMapping("/auth/wechat-login")
    public ApiResponse<Map<String, Object>> wechatLogin(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ApiResponse.error(400, "缺少微信登录 code");
        }

        // 调用微信 code2session API
        String openid;
        try {
            openid = getOpenidFromWechat(code);
        } catch (Exception e) {
            log.error("微信 code2session 失败: {}", e.getMessage(), e);
            return ApiResponse.error(500, "微信登录服务暂时不可用，请稍后重试");
        }

        if (openid == null || openid.isBlank()) {
            return ApiResponse.error(400, "微信登录失败：无法获取用户标识");
        }

        // 查找或创建用户
        String username = "wx_" + openid;
        User user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            // 首次登录，自动注册
            user = userService.createUser(username, UUID.randomUUID().toString(), "微信用户");
            auditLogService.record(username, "WX_REGISTER", "微信用户自动注册", null);
        }

        // 生成 JWT
        String token = jwtService.generateAccessToken(user.getUsername(), user.getRole());
        String refreshToken = refreshTokenService.createRefreshToken(user.getId());

        auditLogService.record(username, "WX_LOGIN", "微信登录", null);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("token", token);
        data.put("refreshToken", refreshToken);
        data.put("userId", user.getId());
        data.put("username", user.getUsername());

        return ApiResponse.success("登录成功", data);
    }

    /**
     * 族谱搜索（简化版）
     * GET /api/mobile/publications/{pubId}/search?q=xxx
     */
    @Operation(summary = "搜索人物", description = "按姓名搜索族谱中的成员")
    @GetMapping("/publications/{pubId}/search")
    public ApiResponse<List<Map<String, Object>>> search(
            @PathVariable Long pubId,
            @RequestParam String q,
            @RequestParam(required = false) String shareToken,
            jakarta.servlet.http.HttpServletRequest request) {

        com.genealogy.server.auth.AccessSubject subject;
        if (shareToken != null && !shareToken.isBlank()) {
            try {
                PublicationShareLink shareLink = shareLinkService.validateToken(shareToken);
                subject = new ShareSubject(shareLink.getId(), shareLink.getPublicationId(), shareLink.isAllowExport(), shareLink.getRedactionProfileJson());
            } catch (Exception e) {
                throw new ForbiddenException("分享链接无效或已过期");
            }
        } else {
            String username = (String) request.getAttribute("currentUsername");
            if (username == null) {
                throw new ForbiddenException("未登录或未提供分享码");
            }
            User user = userRepository.findByUsername(username).orElseThrow(() -> new ForbiddenException("用户不存在"));
            subject = new UserSubject(user.getId(), user.getRole(), username);
        }

        // 校验权限：READ_REDACTED (查看) 或 READ_FULL
        if (!authorizationService.can(subject, pubId, AccessPermission.READ_FULL) && 
            !authorizationService.can(subject, pubId, AccessPermission.READ_REDACTED)) {
            throw new ForbiddenException("无权访问该族谱");
        }

        Map<String, Object> data = publicationService.loadPublication(pubId);
        @SuppressWarnings("unchecked")
        Map<String, Object> pubJson = (Map<String, Object>) data.get("publication");
        @SuppressWarnings("unchecked")
        Map<String, Object> people = (Map<String, Object>) pubJson.get("people");

        List<Map<String, Object>> results = new ArrayList<>();
        if (people != null && q != null && !q.isBlank()) {
            String query = q.trim().toLowerCase();
            for (Object value : people.values()) {
                @SuppressWarnings("unchecked")
                Map<String, Object> person = (Map<String, Object>) value;
                String name = (String) person.get("name");
                if (name != null && name.toLowerCase().contains(query)) {
                    results.add(person);
                }
            }
        }

        return ApiResponse.success(results);
    }

    /**
     * 调用微信 code2session 接口获取 openid
     */
    private String getOpenidFromWechat(String code) {
        if (wechatAppId.isBlank() || wechatSecret.isBlank()) {
            if (allowMock) {
                // 开发模式：返回模拟 openid
                log.warn("微信 appid/secret 未配置，使用模拟 openid (code={})", code);
                return "mock_openid_" + code.hashCode();
            }
            throw new RuntimeException("微信 appid/secret 未配置");
        }

        String url = String.format(
            "https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
            wechatAppId, wechatSecret, code
        );

        RestTemplate restTemplate = new RestTemplate();
        String response = restTemplate.getForObject(url, String.class);
        log.info("微信 code2session 响应: {}", response);

        try {
            // 简单 JSON 解析（避免引入额外依赖）
            if (response != null && response.contains("openid")) {
                int start = response.indexOf("\"openid\":\"") + 10;
                int end = response.indexOf("\"", start);
                return response.substring(start, end);
            }
        } catch (Exception e) {
            log.error("解析微信响应失败: {}", e.getMessage());
        }
        return null;
    }
}
