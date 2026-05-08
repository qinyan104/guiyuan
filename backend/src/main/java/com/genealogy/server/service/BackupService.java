package com.genealogy.server.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class BackupService {

    private final String datasourceUrl;
    private final String datasourceUsername;
    private final String datasourcePassword;

    public BackupService(
            @Value("${spring.datasource.url}") String datasourceUrl,
            @Value("${spring.datasource.username}") String datasourceUsername,
            @Value("${spring.datasource.password}") String datasourcePassword) {
        this.datasourceUrl = datasourceUrl;
        this.datasourceUsername = datasourceUsername;
        this.datasourcePassword = datasourcePassword;
    }

    public BackupResult runBackup() throws IOException, InterruptedException {
        String dbName = extractDbName(datasourceUrl);
        String host = extractHost(datasourceUrl);
        int port = extractPort(datasourceUrl);

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename = "genealogy_backup_" + timestamp + ".sql";

        ProcessBuilder pb = new ProcessBuilder(
                "mysqldump",
                "-h" + host,
                "-P" + port,
                "-u" + datasourceUsername,
                "--default-character-set=utf8mb4",
                "--single-transaction",
                "--routines",
                "--triggers",
                dbName
        );
        pb.environment().put("MYSQL_PWD", datasourcePassword);
        pb.redirectErrorStream(false);

        Process process = pb.start();
        InputStream inputStream = process.getInputStream();
        int exitCode = process.waitFor();

        return new BackupResult(filename, inputStream, exitCode);
    }

    public record BackupResult(String filename, InputStream inputStream, int exitCode) {}

    String extractDbName(String url) {
        validateJdbcUrl(url);
        int slash = url.lastIndexOf('/');
        int q = url.indexOf('?', slash);
        return q > 0 ? url.substring(slash + 1, q) : url.substring(slash + 1);
    }

    String extractHost(String url) {
        validateJdbcUrl(url);
        String afterScheme = url.substring(url.indexOf("://") + 3);
        int c = afterScheme.indexOf(':');
        int s = afterScheme.indexOf('/');
        String host = c > 0 && c < s ? afterScheme.substring(0, c) : afterScheme.substring(0, s);
        if (!host.matches("[\\w.-]+")) {
            throw new IllegalArgumentException("无效的主机名: " + host);
        }
        return host;
    }

    int extractPort(String url) {
        validateJdbcUrl(url);
        String afterScheme = url.substring(url.indexOf("://") + 3);
        int c = afterScheme.indexOf(':');
        int s = afterScheme.indexOf('/');
        if (c > 0 && c < s) {
            String portStr = afterScheme.substring(c + 1, s);
            if (!portStr.matches("\\d+")) {
                throw new IllegalArgumentException("无效的端口号: " + portStr);
            }
            return Integer.parseInt(portStr);
        }
        return 3306;
    }

    void validateJdbcUrl(String url) {
        if (url == null || !url.startsWith("jdbc:mysql://")) {
            throw new IllegalArgumentException("无效的 JDBC URL 格式");
        }
    }
}
