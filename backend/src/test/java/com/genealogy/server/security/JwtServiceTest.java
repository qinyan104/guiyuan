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
}
