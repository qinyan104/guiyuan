package com.genealogy.server.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UploadContentValidatorTest {
    @Test
    void acceptsMatchingSignatures() {
        assertThat(UploadContentValidator.hasExpectedSignature(
                new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}, "image/jpeg")).isTrue();
        assertThat(UploadContentValidator.hasExpectedSignature(
                "%PDF-1.7".getBytes(), "application/pdf")).isTrue();
    }

    @Test
    void rejectsMismatchedSignatures() {
        assertThat(UploadContentValidator.hasExpectedSignature(
                "%PDF-1.7".getBytes(), "image/png")).isFalse();
        assertThat(UploadContentValidator.hasExpectedSignature(new byte[0], "image/jpeg")).isFalse();
    }
}
