package com.genealogy.server.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    public AuthInterceptor(JwtService jwtService, ObjectMapper objectMapper) {
        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            writeUnauthorized(response);
            return false;
        }

        String token = authHeader.substring(7);
        if (!jwtService.isTokenValid(token)) {
            writeUnauthorized(response);
            return false;
        }

        String username = jwtService.extractUsername(token);
        if (username == null) {
            writeUnauthorized(response);
            return false;
        }

        request.setAttribute("currentUsername", username);
        return true;
    }

    private void writeUnauthorized(HttpServletResponse response) throws Exception {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        ApiResponse<?> body = ApiResponse.error(401, "未登录或 token 已失效");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
