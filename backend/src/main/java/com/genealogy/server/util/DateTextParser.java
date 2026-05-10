package com.genealogy.server.util;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class DateTextParser {

    private static final Pattern YEAR_PATTERN = Pattern.compile("(\\d{4})");

    private DateTextParser() {}

    public static Optional<Integer> extractYear(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }
        Matcher m = YEAR_PATTERN.matcher(text);
        if (m.find()) {
            int year = Integer.parseInt(m.group(1));
            return Optional.of(year);
        }
        return Optional.empty();
    }
}
