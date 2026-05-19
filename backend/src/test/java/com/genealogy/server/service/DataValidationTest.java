package com.genealogy.server.service;

import com.genealogy.server.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DataValidationTest {

    // V1: birth year > death year -> reject
    @Test
    void testBirthAfterDeath_ThrowsException() {
        Map<String, Object> person = new HashMap<>();
        person.put("birth", "2024");
        person.put("death", "2020");
        assertThatThrownBy(() ->
            DataValidationService.validatePersonDates(person)
        ).isInstanceOf(BadRequestException.class)
         .hasMessageContaining("出生年份不能晚于去世年份");
    }

    // V1: birth == death -> ok (infant death)
    @Test
    void testBirthEqualsDeath_Ok() {
        Map<String, Object> person = new HashMap<>();
        person.put("birth", "2024");
        person.put("death", "2024");
        assertThatCode(() ->
            DataValidationService.validatePersonDates(person)
        ).doesNotThrowAnyException();
    }

    // V1: birth before death -> ok
    @Test
    void testBirthBeforeDeath_Ok() {
        Map<String, Object> person = new HashMap<>();
        person.put("birth", "2020");
        person.put("death", "2024");
        assertThatCode(() ->
            DataValidationService.validatePersonDates(person)
        ).doesNotThrowAnyException();
    }

    // V1: missing dates -> skip silently
    @Test
    void testMissingDates_Ok() {
        Map<String, Object> person = new HashMap<>();
        assertThatCode(() ->
            DataValidationService.validatePersonDates(person)
        ).doesNotThrowAnyException();
    }

    // V2: deceased=true but no death date -> reject
    @Test
    void testDeceasedWithoutDeathDate_ThrowsException() {
        Map<String, Object> person = new HashMap<>();
        person.put("deceased", true);
        assertThatThrownBy(() ->
            DataValidationService.validatePersonLifeStatus(person)
        ).isInstanceOf(BadRequestException.class)
         .hasMessageContaining("已故人物必须填写去世日期");
    }

    // V2: deceased=false with death date -> ok
    @Test
    void testNotDeceasedWithDeathDate_Ok() {
        Map<String, Object> person = new HashMap<>();
        person.put("deceased", false);
        person.put("death", "2024");
        assertThatCode(() ->
            DataValidationService.validatePersonLifeStatus(person)
        ).doesNotThrowAnyException();
    }

    // V3: circular ancestry detection
    @Test
    void testCircularAncestry_ThrowsException() {
        Map<String, String> childToParent = new HashMap<>();
        childToParent.put("A", "B");
        childToParent.put("B", "A"); // cycle: A -> B -> A
        assertThatThrownBy(() ->
            DataValidationService.checkCircularAncestry(childToParent)
        ).isInstanceOf(BadRequestException.class)
         .hasMessageContaining("循环祖先引用");
    }

    // V3: valid ancestry chain -> ok
    @Test
    void testValidAncestry_Ok() {
        Map<String, String> childToParent = new HashMap<>();
        childToParent.put("A", "B");
        childToParent.put("B", "C");
        childToParent.put("C", "D");
        assertThatCode(() ->
            DataValidationService.checkCircularAncestry(childToParent)
        ).doesNotThrowAnyException();
    }
}
