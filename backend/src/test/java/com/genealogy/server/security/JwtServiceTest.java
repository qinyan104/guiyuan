package com.genealogy.server.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private static final String TEST_SECRET = "test-secret-key-that-is-at-least-256-bits-long-for-hs256!!";
    private static final long TTL = 900_000;
    private static final long SHORT_TTL = 50;

    private JwtService jwtService;
    private JwtService shortTtlService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(TEST_SECRET, TTL);
        shortTtlService = new JwtService(TEST_SECRET, SHORT_TTL);
    }

    @Test
    void generateAccessToken_usernameCanBeExtracted() {
        String token = jwtService.generateAccessToken("testuser", "USER");
        assertEquals("testuser", jwtService.extractUsername(token));
    }

    @Test
    void generateAccessToken_roleCanBeExtracted() {
        String token = jwtService.generateAccessToken("admin", "ADMIN");
        assertEquals("ADMIN", jwtService.extractRole(token));
    }

    @Test
    void validToken_isValid() {
        String token = jwtService.generateAccessToken("testuser", "USER");
        assertTrue(jwtService.isTokenValid(token));
    }

    @Test
    void expiredToken_isInvalid() throws InterruptedException {
        String token = shortTtlService.generateAccessToken("testuser", "USER");
        Thread.sleep(100);
        assertFalse(shortTtlService.isTokenValid(token));
    }

    @Test
    void malformedToken_isInvalid() {
        assertFalse(jwtService.isTokenValid("invalid.jwt.token"));
    }

    @Test
    void tokenFromDifferentSecret_isInvalid() {
        JwtService otherService = new JwtService(
                "a-different-secret-key-that-is-also-256-bits-long-okay!!", TTL);
        String token = jwtService.generateAccessToken("testuser", "USER");
        assertFalse(otherService.isTokenValid(token));
    }

    @Test
    void differentUsernameProducesDifferentToken() {
        String token1 = jwtService.generateAccessToken("user1", "USER");
        String token2 = jwtService.generateAccessToken("user2", "USER");
        assertNotEquals(token1, token2);
    }

    // --- JWT_SECRET 格式兼容性回归测试 ---
    // 历史部署中 JWT_SECRET 出现过三种格式，它们都必须继续按“原始字节”使用，
    // 绝不能被 Base64 解码（否则 hex 密钥会被静默换成另一把密钥）。

    @Test
    void hexSecret_isUsedAsRawBytes_andRemainsStableAcrossInstances() {
        String hexSecret = "65506555e4c08d69df4885163cf1de7683cdd766ac328d13c50bfaccac9e1212";
        JwtService first = new JwtService(hexSecret, TTL);
        JwtService second = new JwtService(hexSecret, TTL);

        String token = first.generateAccessToken("testuser", "USER");
        assertTrue(second.isTokenValid(token), "同一 hex 密钥在不同实例间必须可互相验签");
    }

    @Test
    void base64Secret_isUsedAsRawBytes() {
        String base64Secret = "dGhpcy1pcy1hLWJhc2U2NC1rZXktZm9yLWp3dC1zaWduaW5nLXRlc3Q=";
        JwtService service = new JwtService(base64Secret, TTL);

        String token = service.generateAccessToken("testuser", "USER");
        assertTrue(service.isTokenValid(token));
    }

    @Test
    void shortSecret_isRejectedWithActionableMessage() {
        String shortSecret = "too-short";
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> new JwtService(shortSecret, TTL));
        assertTrue(ex.getMessage().contains("JWT_SECRET 长度不足"),
                "异常信息应说明长度不足，实际为: " + ex.getMessage());
        assertTrue(ex.getMessage().contains("openssl rand -base64 64"),
                "异常信息应给出修复命令，实际为: " + ex.getMessage());
    }

    @Test
    void blankSecret_isRejectedWithActionableMessage() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> new JwtService("   ", TTL));
        assertTrue(ex.getMessage().contains("JWT_SECRET 环境变量未设置"),
                "异常信息应说明变量未设置，实际为: " + ex.getMessage());
    }

    @Test
    void secretShorterThanMinBytes_isRejected() {
        // 31 字节：比 256 位少 1 字节，必须被拒绝
        String almostLongEnough = "0123456789abcdef0123456789abcde";
        assertEquals(JwtService.MIN_SECRET_BYTES - 1, almostLongEnough.getBytes().length);
        assertThrows(IllegalArgumentException.class, () -> new JwtService(almostLongEnough, TTL));
    }

    @Test
    void secretExactlyAtMinBytes_isAccepted() {
        // 32 字节：恰好 256 位，必须被接受
        String exactlyLongEnough = "0123456789abcdef0123456789abcdef";
        assertEquals(JwtService.MIN_SECRET_BYTES, exactlyLongEnough.getBytes().length);
        JwtService service = new JwtService(exactlyLongEnough, TTL);

        String token = service.generateAccessToken("testuser", "USER");
        assertTrue(service.isTokenValid(token));
    }

    @Test
    void testProfileSecret_stillWorks() {
        // application-test.properties 中配置的密钥（本例 35 字节）必须保持兼容
        JwtService service = new JwtService("test-secret-key-for-unit-tests-only", TTL);
        String token = service.generateAccessToken("testuser", "USER");
        assertTrue(service.isTokenValid(token));
    }
}
