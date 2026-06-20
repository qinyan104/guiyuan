package com.genealogy.server.controller;

import com.genealogy.server.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

@RestController
@RequestMapping("/api")
@Tag(name = "健康检查", description = "系统健康状态检查")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Operation(summary = "检查系统健康状态", description = "通过数据库连接检查系统是否正常运行")
    @GetMapping("/health")
    public ApiResponse<String> health() {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT 1")) {
            if (rs.next() && rs.getInt(1) == 1) {
                return ApiResponse.success("ok", "ok");
            }
            return ApiResponse.error("database check failed");
        } catch (Exception e) {
            throw new RuntimeException("Health check failed: " + e.getMessage(), e);
        }
    }
}
