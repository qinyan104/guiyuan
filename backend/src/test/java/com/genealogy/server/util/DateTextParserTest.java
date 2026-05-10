package com.genealogy.server.util;

import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;

class DateTextParserTest {

    @Test
    void testPureYear() {
        assertThat(DateTextParser.extractYear("2024")).hasValue(2024);
    }

    @Test
    void testIsoDate() {
        assertThat(DateTextParser.extractYear("2024-01-15")).hasValue(2024);
    }

    @Test
    void testChineseDate() {
        assertThat(DateTextParser.extractYear("2024年1月15日")).hasValue(2024);
    }

    @Test
    void testChineseDateNoLeadingZero() {
        assertThat(DateTextParser.extractYear("2024年1月5日")).hasValue(2024);
    }

    @Test
    void testChineseImperialEra() {
        assertThat(DateTextParser.extractYear("康熙六十年")).isEmpty();
    }

    @Test
    void testNullInput() {
        assertThat(DateTextParser.extractYear(null)).isEmpty();
    }

    @Test
    void testEmptyString() {
        assertThat(DateTextParser.extractYear("")).isEmpty();
    }

    @Test
    void testBlankString() {
        assertThat(DateTextParser.extractYear("   ")).isEmpty();
    }

    @Test
    void testYearInMiddleOfText() {
        assertThat(DateTextParser.extractYear("生于公元2024年")).hasValue(2024);
    }
}
