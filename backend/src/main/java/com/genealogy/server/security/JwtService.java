package com.genealogy.server.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    /**
     * HS256 要求密钥至少 256 位（32 字节）。
     */
    static final int MIN_SECRET_BYTES = 32;

    private final SecretKey signingKey;
    private final long accessTokenTtl;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-ttl}") long accessTokenTtl) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException(
                    "JWT_SECRET 环境变量未设置。请在启动前设置 JWT_SECRET 环境变量。" +
                    "可使用 openssl rand -base64 64 生成密钥。");
        }
        this.signingKey = Keys.hmacShaKeyFor(decodeSigningKey(secret));
        this.accessTokenTtl = accessTokenTtl;
    }

    /**
     * 将配置的密钥转换为 HMAC 签名密钥的原始字节。
     *
     * <p>密钥按 UTF-8 原始字节使用，<b>不做 Base64 解码</b>。这是有意的：
     * 历史部署中曾同时使用过三种格式的 JWT_SECRET（openssl 输出的 Base64、
     * 64 位十六进制串、以及纯文本），若对它们擅自做 Base64 解码，
     * 十六进制密钥会被静默解码成另一把密钥，导致已签发的 token 全部失效。
     *
     * <p>因此这里只做长度校验，保证 {@code hmacShaKeyFor} 不会因密钥过短而抛异常。
     */
    static byte[] decodeSigningKey(String secret) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalArgumentException(
                    "JWT_SECRET 长度不足：当前 " + keyBytes.length + " 字节，至少需要 "
                    + MIN_SECRET_BYTES + " 字节（256 位）。" +
                    "请使用 openssl rand -base64 64 重新生成密钥。");
        }
        return keyBytes;
    }

    public String generateAccessToken(String username, String role) {
        return Jwts.builder()
                .subject(username)
                .claims(Map.of("role", role))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTokenTtl))
                .signWith(signingKey)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return extractClaims(token).get("role", String.class);
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
