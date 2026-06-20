package com.genealogy.server.validation;

import com.genealogy.server.types.FamilyUnit;
import com.genealogy.server.types.Person;
import com.genealogy.server.types.PublicationData;
import com.genealogy.server.validation.rules.*;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 校验引擎单元测试
 */
class GenealogyGraphTest {

    @Test
    void buildsParentChildRelationships() {
        Map<String, Person> people = new LinkedHashMap<>();
        people.put("p1", person("p1", "父亲", "male", "1950"));
        people.put("p2", person("p2", "母亲", "female", "1952"));
        people.put("p3", person("p3", "儿子", "male", "1978"));

        Map<String, FamilyUnit> families = new LinkedHashMap<>();
        families.put("f1", new FamilyUnit("f1", List.of("p1", "p2"), List.of("p3"), null));

        GenealogyGraph graph = GenealogyGraph.from(new PublicationData("T", "", "f1", people, families, null));

        assertEquals(2, graph.getParents("p3").size());
        assertEquals(1, graph.getChildren("p1").size());
        assertEquals("儿子", graph.getChildren("p1").get(0).name());
        assertEquals(1, graph.getSpouses("p1").size());
        assertEquals("母亲", graph.getSpouses("p1").get(0).name());
    }

    @Test
    void computesGenerations() {
        Map<String, Person> people = new LinkedHashMap<>();
        people.put("p1", person("p1", "始祖", "male", "1900"));
        people.put("p2", person("p2", "二代", "male", "1930"));
        people.put("p3", person("p3", "三代", "male", "1960"));

        Map<String, FamilyUnit> families = new LinkedHashMap<>();
        families.put("f1", new FamilyUnit("f1", List.of("p1"), List.of("p2"), null));
        families.put("f2", new FamilyUnit("f2", List.of("p2"), List.of("p3"), null));

        GenealogyGraph graph = GenealogyGraph.from(new PublicationData("T", "", "f1", people, families, null));

        assertEquals(0, graph.getGeneration("p1"));
        assertEquals(1, graph.getGeneration("p2"));
        assertEquals(2, graph.getGeneration("p3"));
        assertEquals(2, graph.getMaxGeneration());
    }

    @Test
    void detectsConnectedComponents() {
        Map<String, Person> people = new LinkedHashMap<>();
        people.put("p1", person("p1", "A树-父", "male", "1950"));
        people.put("p2", person("p2", "A树-子", "male", "1978"));
        people.put("p3", person("p3", "B树-独立", "male", "1960"));

        Map<String, FamilyUnit> families = new LinkedHashMap<>();
        families.put("f1", new FamilyUnit("f1", List.of("p1"), List.of("p2"), null));

        GenealogyGraph graph = GenealogyGraph.from(new PublicationData("T", "", "f1", people, families, null));

        List<Set<String>> components = graph.getConnectedComponents();
        assertEquals(2, components.size());
    }

    private Person person(String id, String name, String gender, String birth) {
        return new Person(id, name, gender, birth, null, null, null, null, null, null, null, null, null, null);
    }
}

class AgeGapRuleTest {

    @Test
    void flagsYoungParent() {
        Map<String, Person> people = new LinkedHashMap<>();
        people.put("p1", new Person("p1", "父", "male", "1990", null, null, null, null, null, null, null, null, null, null));
        people.put("p2", new Person("p2", "子", "male", "2000", null, null, null, null, null, null, null, null, null, null));

        Map<String, FamilyUnit> families = new LinkedHashMap<>();
        families.put("f1", new FamilyUnit("f1", List.of("p1"), List.of("p2"), null));

        GenealogyGraph graph = GenealogyGraph.from(new PublicationData("T", "", "f1", people, families, null));
        List<ValidationFinding> findings = new AgeGapRule().validate(graph);

        assertFalse(findings.isEmpty());
        assertTrue(findings.get(0).message().contains("年仅 10 岁"));
    }

    @Test
    void flagsOldParent() {
        Map<String, Person> people = new LinkedHashMap<>();
        people.put("p1", new Person("p1", "父", "male", "1920", null, null, null, null, null, null, null, null, null, null));
        people.put("p2", new Person("p2", "子", "male", "2000", null, null, null, null, null, null, null, null, null, null));

        Map<String, FamilyUnit> families = new LinkedHashMap<>();
        families.put("f1", new FamilyUnit("f1", List.of("p1"), List.of("p2"), null));

        GenealogyGraph graph = GenealogyGraph.from(new PublicationData("T", "", "f1", people, families, null));
        List<ValidationFinding> findings = new AgeGapRule().validate(graph);

        assertFalse(findings.isEmpty());
        assertTrue(findings.get(0).message().contains("已 80 岁"));
    }

    @Test
    void noWarningForNormalGap() {
        Map<String, Person> people = new LinkedHashMap<>();
        people.put("p1", new Person("p1", "父", "male", "1950", null, null, null, null, null, null, null, null, null, null));
        people.put("p2", new Person("p2", "子", "male", "1978", null, null, null, null, null, null, null, null, null, null));

        Map<String, FamilyUnit> families = new LinkedHashMap<>();
        families.put("f1", new FamilyUnit("f1", List.of("p1"), List.of("p2"), null));

        GenealogyGraph graph = GenealogyGraph.from(new PublicationData("T", "", "f1", people, families, null));
        List<ValidationFinding> findings = new AgeGapRule().validate(graph);

        assertTrue(findings.isEmpty());
    }
}

class FutureDateRuleTest {

    @Test
    void flagsFutureBirth() {
        Map<String, Person> people = new LinkedHashMap<>();
        people.put("p1", new Person("p1", "未来人", "male", "2099", null, null, null, null, null, null, null, null, null, null));

        GenealogyGraph graph = GenealogyGraph.from(new PublicationData("T", "", "", people, new LinkedHashMap<>(), null));
        List<ValidationFinding> findings = new FutureDateRule().validate(graph);

        assertEquals(1, findings.size());
        assertEquals(ValidationSeverity.ERROR, findings.get(0).severity());
    }
}

class DuplicatePersonRuleTest {

    @Test
    void detectsDuplicateNames() {
        Map<String, Person> people = new LinkedHashMap<>();
        people.put("p1", new Person("p1", "张三", "male", "1950", null, null, null, null, null, null, null, null, null, null));
        people.put("p2", new Person("p2", "张三", "male", "1951", null, null, null, null, null, null, null, null, null, null));

        GenealogyGraph graph = GenealogyGraph.from(new PublicationData("T", "", "", people, new LinkedHashMap<>(), null));
        List<ValidationFinding> findings = new DuplicatePersonRule().validate(graph);

        assertFalse(findings.isEmpty());
        assertTrue(findings.get(0).message().contains("可能重复"));
    }

    @Test
    void ignoresDifferentNames() {
        Map<String, Person> people = new LinkedHashMap<>();
        people.put("p1", new Person("p1", "张三", "male", "1950", null, null, null, null, null, null, null, null, null, null));
        people.put("p2", new Person("p2", "李四", "male", "1950", null, null, null, null, null, null, null, null, null, null));

        GenealogyGraph graph = GenealogyGraph.from(new PublicationData("T", "", "", people, new LinkedHashMap<>(), null));
        List<ValidationFinding> findings = new DuplicatePersonRule().validate(graph);

        assertTrue(findings.isEmpty());
    }
}

class NameQualityRuleTest {

    @Test
    void flagsEmptyName() {
        Map<String, Person> people = new LinkedHashMap<>();
        people.put("p1", new Person("p1", "", "male", null, null, null, null, null, null, null, null, null, null, null));

        GenealogyGraph graph = GenealogyGraph.from(new PublicationData("T", "", "", people, new LinkedHashMap<>(), null));
        List<ValidationFinding> findings = new NameQualityRule().validate(graph);

        assertFalse(findings.isEmpty());
        assertTrue(findings.get(0).message().contains("缺少姓名"));
    }

    @Test
    void flagsDigitsInName() {
        Map<String, Person> people = new LinkedHashMap<>();
        people.put("p1", new Person("p1", "张三(长子)", "male", null, null, null, null, null, null, null, null, null, null, null));

        GenealogyGraph graph = GenealogyGraph.from(new PublicationData("T", "", "", people, new LinkedHashMap<>(), null));
        List<ValidationFinding> findings = new NameQualityRule().validate(graph);

        assertFalse(findings.isEmpty());
    }
}
