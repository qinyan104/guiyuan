package com.genealogy.server.util;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

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
    void acceptsDecodableRasterImage() throws IOException {
        BufferedImage image = new BufferedImage(2, 3, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);

        assertThat(UploadContentValidator.hasValidImageDimensions(output.toByteArray(), "image/png")).isTrue();
        assertThat(UploadContentValidator.hasValidImageDimensions(new byte[]{(byte) 0x89}, "image/png")).isFalse();

        BufferedImage oversized = new BufferedImage(10_001, 1, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream oversizedOutput = new ByteArrayOutputStream();
        ImageIO.write(oversized, "png", oversizedOutput);
        assertThat(UploadContentValidator.hasValidImageDimensions(oversizedOutput.toByteArray(), "image/png")).isFalse();
    }

    @Test
    void rejectsMismatchedSignatures() {
        assertThat(UploadContentValidator.hasExpectedSignature(
                "%PDF-1.7".getBytes(), "image/png")).isFalse();
        assertThat(UploadContentValidator.hasExpectedSignature(new byte[0], "image/jpeg")).isFalse();
    }
}
