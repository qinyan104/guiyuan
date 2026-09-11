package com.genealogy.server.util;

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
