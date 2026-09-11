package com.genealogy.server.util;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/** Validates file signatures instead of trusting a client supplied MIME type. */
public final class UploadContentValidator {
    private UploadContentValidator() {}

    public static boolean hasExpectedSignature(byte[] data, String mimeType) {
        if (data == null || mimeType == null) return false;
        return switch (mimeType) {
            case "image/jpeg" -> startsWith(data, 0xFF, 0xD8, 0xFF);
            case "image/png" -> startsWith(data, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
            case "image/gif" -> startsWithAscii(data, "GIF87a") || startsWithAscii(data, "GIF89a");
            case "image/webp" -> startsWithAscii(data, "RIFF") && data.length >= 12
                    && new String(data, 8, 4, StandardCharsets.US_ASCII).equals("WEBP");
            case "application/pdf" -> startsWithAscii(data, "%PDF-");
            default -> false;
        };
    }

    /**
     * Decodes raster images and rejects implausibly large dimensions.
     * WebP is left to the signature check because the JDK has no built-in WebP reader.
     */
    public static boolean hasValidImageDimensions(byte[] data, String mimeType) {
        if (data == null || mimeType == null || "image/webp".equals(mimeType)) return true;
        if (!("image/jpeg".equals(mimeType) || "image/png".equals(mimeType) || "image/gif".equals(mimeType))) {
            return false;
        }
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(data));
            if (image == null) return false;
            long pixels = (long) image.getWidth() * image.getHeight();
            return image.getWidth() <= 10_000 && image.getHeight() <= 10_000 && pixels <= 50_000_000L;
        } catch (IOException | RuntimeException e) {
            return false;
        }
    }

    private static boolean startsWith(byte[] data, int... signature) {
        if (data.length < signature.length) return false;
        for (int i = 0; i < signature.length; i++) {
            if ((data[i] & 0xFF) != signature[i]) return false;
        }
        return true;
    }

    private static boolean startsWithAscii(byte[] data, String signature) {
        byte[] expected = signature.getBytes(StandardCharsets.US_ASCII);
        return data.length >= expected.length && Arrays.compare(data, 0, expected.length, expected, 0, expected.length) == 0;
    }
}
