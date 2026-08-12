package com.genealogy.server.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.security.SecureRandom;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final SecretKey signingKey;
    private final long accessTokenTtl;

    @Autowired
    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-ttl}") long accessTokenTtl,
            @Value("${app.jwt.allow-ephemeral-secret:false}") boolean allowEphemeralSecret) {
        if (secret == null || secret.isBlank()) {
            if (allowEphemeralSecret) {
                byte[] ephemeralSecret = new byte[64];
                SECURE_RANDOM.nextBytes(ephemeralSecret);
                this.signingKey = Keys.hmacShaKeyFor(ephemeralSecret);
                this.accessTokenTtl = accessTokenTtl;
                return;
            }
            throw new IllegalArgumentException(
                    "JWT_SECRET 环境变量未设置。请在启动前设置 JWT_SECRET 环境变量。" +
                    "可使用 openssl rand -base64 64 生成密钥。");
        }
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(
                java.util.Base64.getEncoder().encodeToString(secret.getBytes())));
        this.accessTokenTtl = accessTokenTtl;
    }

    JwtService(String secret, long accessTokenTtl) {
        this(secret, accessTokenTtl, false);
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
