package com.genealogy.server.types;

import org.junit.jupiter.api.Test;

import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 守住 {@code Map<String, Object>} ↔ 类型化模型 的边界。
 *
 * <p>族谱数据在 GEDCOM 导入/导出、分支合并与持久化之间以 Map 形态流动，
 * 由 {@link Person} / {@link FamilyUnit} / {@link PublicationData} 做类型化包装。
 * 一旦给 record 加了字段却忘了同步 {@code fromMap} / {@code toMap}，
 * 数据会在往返途中静默丢失（历史上 {@code PersonDTO} 已经这样和实体、前端漂移过）。
 * 这组用例的作用就是让这类漂移立刻变成失败，而不是等线上丢数据才发现。
 */
class PublicationDataMapContractTest {

    /** 覆盖 {@link Person} 的每一个组件，且全部非 null。 */
    private static Map<String, Object> fullPersonMap() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("name", "张三");
        map.put("gender", "male");
        map.put("birth", "1900-01-01");
        map.put("death", "1980-01-01");
        map.put("deceased", true);
        map.put("age", "80");
        map.put("titleName", "族长");
        map.put("clan", "太原");
        map.put("note", "备注");
        map.put("highlightRole", "focus");
        map.put("isMountPoint", true);
        map.put("targetPublicationId", 7L);
        map.put("targetRootPersonId", 42L);
        return map;
    }

    @Test
    void personRoundTripKeepsEveryField() {
        Map<String, Object> source = fullPersonMap();

        Person person = Person.fromMap("p1", source);

        assertThat(person.toMap()).containsAllEntriesOf(source);
        assertThat(person.toMap()).containsEntry("id", "p1");
    }

    @Test
    void personToMapCoversEveryRecordComponent() {
        Person person = Person.fromMap("p1", fullPersonMap());

        Set<String> emitted = person.toMap().keySet();
        Set<String> components = Arrays.stream(Person.class.getRecordComponents())
                .map(RecordComponent::getName)
                .collect(Collectors.toSet());

        assertThat(emitted)
                .as("给 Person 增加字段时，必须同步 fromMap/toMap，并更新本用例的 fullPersonMap()")
                .containsExactlyInAnyOrderElementsOf(components);
    }

    @Test
    void familyUnitRoundTripKeepsEveryField() {
        Map<String, Object> source = new LinkedHashMap<>();
        source.put("adults", List.of("p1", "p2"));
        source.put("children", List.of("p3"));
        source.put("branchMode", "uxorilocal");

        FamilyUnit family = FamilyUnit.fromMap("f1", source);

        assertThat(family.toMap()).containsAllEntriesOf(source);
        assertThat(family.toMap()).containsEntry("id", "f1");
    }

    @Test
    void publicationRoundTripKeepsPeopleFamiliesAndInfo() {
        Map<String, Object> source = new LinkedHashMap<>();
        source.put("title", "李氏族谱");
        source.put("subtitle", "太原堂");
        source.put("focusFamilyId", "f1");
        source.put("people", Map.of("p1", fullPersonMap()));
        source.put("families", Map.of("f1", Map.of(
                "adults", List.of("p1"),
                "children", List.of("p3"))));
        source.put("info", Map.of("description", "简介"));

        Map<String, Object> roundTripped = PublicationData.fromMap(source).toMap();

        assertThat(roundTripped).containsEntry("title", "李氏族谱");
        assertThat(roundTripped).containsEntry("subtitle", "太原堂");
        assertThat(roundTripped).containsEntry("focusFamilyId", "f1");
        assertThat(roundTripped).containsEntry("info", Map.of("description", "简介"));

        Map<String, Object> people = asMap(roundTripped.get("people"));
        assertThat(people).containsKey("p1");
        assertThat(asMap(people.get("p1"))).containsAllEntriesOf(fullPersonMap());

        Map<String, Object> families = asMap(roundTripped.get("families"));
        assertThat(asMap(families.get("f1")))
                .containsEntry("adults", List.of("p1"))
                .containsEntry("children", List.of("p3"));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object value) {
        return (Map<String, Object>) value;
    }
}
