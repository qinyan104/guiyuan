package com.genealogy.server.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class HashUtilsTest {

    @Test
    void sha256Hex_knownInput_returnsExpectedHash() {
        assertEquals("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
                HashUtils.sha256Hex("hello"));
    }

    @Test
    void sha256Hex_emptyString_returns64CharHash() {
        String hash = HashUtils.sha256Hex("");
        assertNotNull(hash);
        assertEquals(64, hash.length());
        assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", hash);
    }

    @Test
    void sha256Hex_nullInput_throwsNullPointerException() {
        assertThrows(NullPointerException.class, () -> HashUtils.sha256Hex(null));
    }

    @Test
    void sha256Hex_deterministic() {
        String first = HashUtils.sha256Hex("族谱管理系统");
        String second = HashUtils.sha256Hex("族谱管理系统");
        assertEquals(first, second);
    }

    @Test
    void sha256Hex_outputHasCorrectLength() {
        String hash = HashUtils.sha256Hex("any input string here");
        assertEquals(64, hash.length());
    }
}
