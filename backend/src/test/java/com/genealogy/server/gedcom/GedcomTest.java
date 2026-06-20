package com.genealogy.server.gedcom;

import com.genealogy.server.gedcom.GedcomRecord.GedcomFamily;
import com.genealogy.server.gedcom.GedcomRecord.GedcomPerson;
import com.genealogy.server.gedcom.GedcomRecord.ParseResult;
import com.genealogy.server.types.FamilyUnit;
import com.genealogy.server.types.Person;
import com.genealogy.server.types.PublicationData;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class GedcomParserTest {

    private final GedcomParser parser = new GedcomParser();

    @Test
    void parseSimpleFamily() throws IOException {
        String gedcom = """
            0 HEAD
            1 SOUR TEST
            1 GEDC
            2 VERS 5.5
            1 CHAR UTF-8
            0 @I1@ INDI
            1 NAME 张三
            1 SEX M
            1 BIRT
            2 DATE 1950
            1 FAMS @F1@
            0 @I2@ INDI
            1 NAME 李四
            1 SEX F
            1 BIRT
            2 DATE 1952
            1 FAMS @F1@
            0 @I3@ INDI
            1 NAME 张小三
            1 SEX M
            1 BIRT
            2 DATE 1978
            1 FAMC @F1@
            0 @F1@ FAM
            1 HUSB @I1@
            1 WIFE @I2@
            1 CHIL @I3@
            0 TRLR
            """;

        ParseResult result = parser.parse(toStream(gedcom));

        assertEquals(3, result.persons().size());
        assertEquals(1, result.families().size());
        assertTrue(result.warnings().isEmpty());

        // 验证人物
        GedcomPerson zhangSan = result.persons().get(0);
        assertEquals("@I1@", zhangSan.id());
        assertEquals("张三", zhangSan.name());
        assertEquals("M", zhangSan.sex());
        assertEquals("1950", zhangSan.birthDate());
        assertFalse(zhangSan.deceased());
        assertEquals(1, zhangSan.familySpouseIds().size());
        assertEquals("@F1@", zhangSan.familySpouseIds().get(0));

        GedcomPerson zhangXiaoSan = result.persons().get(2);
        assertEquals("张小三", zhangXiaoSan.name());
        assertEquals(1, zhangXiaoSan.familyChildIds().size());
        assertEquals("@F1@", zhangXiaoSan.familyChildIds().get(0));

        // 验证家庭
        GedcomFamily fam = result.families().get(0);
        assertEquals("@F1@", fam.id());
        assertEquals("@I1@", fam.husbandId());
        assertEquals("@I2@", fam.wifeId());
        assertEquals(1, fam.childrenIds().size());
        assertEquals("@I3@", fam.childrenIds().get(0));
    }

    @Test
    void parseDeceasedPerson() throws IOException {
        String gedcom = """
            0 HEAD
            1 CHAR UTF-8
            0 @I1@ INDI
            1 NAME 王五
            1 SEX M
            1 DEAT
            2 DATE 2020
            0 TRLR
            """;

        ParseResult result = parser.parse(toStream(gedcom));
        assertEquals(1, result.persons().size());

        GedcomPerson wangWu = result.persons().get(0);
        assertTrue(wangWu.deceased());
        assertEquals("2020", wangWu.deathDate());
    }

    @Test
    void parseChineseNameWithoutSlash() throws IOException {
        String gedcom = """
            0 HEAD
            1 CHAR UTF-8
            0 @I1@ INDI
            1 NAME 赵六
            1 SEX M
            0 TRLR
            """;

        ParseResult result = parser.parse(toStream(gedcom));
        assertEquals("赵六", result.persons().get(0).name());
    }

    @Test
    void parseWesternNameWithSlash() throws IOException {
        String gedcom = """
            0 HEAD
            1 CHAR UTF-8
            0 @I1@ INDI
            1 NAME John /Smith/
            1 SEX M
            0 TRLR
            """;

        ParseResult result = parser.parse(toStream(gedcom));
        assertEquals("John Smith", result.persons().get(0).name());
    }

    @Test
    void parseNoteWithContinuation() throws IOException {
        String gedcom = """
            0 HEAD
            1 CHAR UTF-8
            0 @I1@ INDI
            1 NAME 测试
            1 NOTE 这是第一行
            2 CONC 这是拼接
            2 CONT 这是新行
            0 TRLR
            """;

        ParseResult result = parser.parse(toStream(gedcom));
        GedcomPerson person = result.persons().get(0);
        assertEquals("这是第一行这是拼接\n这是新行", person.note());
    }

    @Test
    void parseEmptyFile() throws IOException {
        String gedcom = "0 HEAD\n0 TRLR\n";
        ParseResult result = parser.parse(toStream(gedcom));
        assertTrue(result.persons().isEmpty());
        assertTrue(result.families().isEmpty());
    }

    @Test
    void parseMalformedLineSkipsWithError() throws IOException {
        String gedcom = """
            0 HEAD
            1 CHAR UTF-8
            INVALID LINE WITHOUT LEVEL
            0 @I1@ INDI
            1 NAME 正常人物
            0 TRLR
            """;

        ParseResult result = parser.parse(toStream(gedcom));
        assertFalse(result.warnings().isEmpty()); // 应有警告
        assertEquals(1, result.persons().size()); // 正常人物应被解析
    }

    @Test
    void parseWithFamsFamcReferences() throws IOException {
        // 没有 FAM 记录，只有 FAMS/FAMC 引用
        String gedcom = """
            0 HEAD
            1 CHAR UTF-8
            0 @I1@ INDI
            1 NAME 父亲
            1 SEX M
            1 FAMS @F1@
            0 @I2@ INDI
            1 NAME 母亲
            1 SEX F
            1 FAMS @F1@
            0 @I3@ INDI
            1 NAME 儿子
            1 SEX M
            1 FAMC @F1@
            0 TRLR
            """;

        ParseResult result = parser.parse(toStream(gedcom));
        assertEquals(3, result.persons().size());
        // 没有 FAM 记录，但应在导入服务中从引用重建
        assertEquals(0, result.families().size());
    }

    private ByteArrayInputStream toStream(String s) {
        return new ByteArrayInputStream(s.getBytes(StandardCharsets.UTF_8));
    }
}

class GedcomExporterTest {

    private final GedcomExporter exporter = new GedcomExporter();

    @Test
    void exportSimpleFamily() {
        Map<String, Person> people = new LinkedHashMap<>();
        people.put("p1", new Person("p1", "张三", "male", "1950", null, false, null, null, null, null, null, null, null, null));
        people.put("p2", new Person("p2", "李四", "female", "1952", null, false, null, null, null, null, null, null, null, null));
        people.put("p3", new Person("p3", "张小三", "male", "1978", null, false, null, null, null, null, null, null, null, null));

        Map<String, FamilyUnit> families = new LinkedHashMap<>();
        families.put("f1", new FamilyUnit("f1", java.util.List.of("p1", "p2"), java.util.List.of("p3"), null));

        PublicationData data = new PublicationData("测试族谱", "", "f1", people, families, null);

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        exporter.export(data, output);
        String gedcom = output.toString(StandardCharsets.UTF_8);

        // 验证头部
        assertTrue(gedcom.contains("0 HEAD"));
        assertTrue(gedcom.contains("1 SOUR GUIYUAN"));
        assertTrue(gedcom.contains("1 CHAR UTF-8"));

        // 验证人物
        assertTrue(gedcom.contains("0 @I1@ INDI"));
        assertTrue(gedcom.contains("1 NAME 张三"));
        assertTrue(gedcom.contains("1 SEX M"));
        assertTrue(gedcom.contains("2 DATE 1950"));

        // 验证家庭
        assertTrue(gedcom.contains("0 @F1@ FAM"));
        assertTrue(gedcom.contains("1 HUSB @I1@"));
        assertTrue(gedcom.contains("1 WIFE @I2@"));
        assertTrue(gedcom.contains("1 CHIL @I3@"));

        // 验证 FAMS/FAMC 引用
        assertTrue(gedcom.contains("1 FAMS @F1@"));
        assertTrue(gedcom.contains("1 FAMC @F1@"));

        // 验证结束
        assertTrue(gedcom.contains("0 TRLR"));
    }

    @Test
    void exportDeceasedPerson() {
        Map<String, Person> people = new LinkedHashMap<>();
        people.put("p1", new Person("p1", "逝者", "male", "1930", "2020", true, null, null, null, null, null, null, null, null));

        PublicationData data = new PublicationData("测试", "", "", people, new LinkedHashMap<>(), null);

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        exporter.export(data, output);
        String gedcom = output.toString(StandardCharsets.UTF_8);

        assertTrue(gedcom.contains("1 DEAT"));
        assertTrue(gedcom.contains("2 DATE 2020"));
    }

    @Test
    void exportEmptyPublication() {
        PublicationData data = new PublicationData("空族谱", "", "", new LinkedHashMap<>(), new LinkedHashMap<>(), null);

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        exporter.export(data, output);
        String gedcom = output.toString(StandardCharsets.UTF_8);

        assertTrue(gedcom.contains("0 HEAD"));
        assertTrue(gedcom.contains("0 TRLR"));
    }
}

class GedcomRoundTripTest {

    private final GedcomParser parser = new GedcomParser();
    private final GedcomExporter exporter = new GedcomExporter();

    @Test
    void roundTripPreservesPersons() throws IOException {
        String original = """
            0 HEAD
            1 CHAR UTF-8
            0 @I1@ INDI
            1 NAME 张三
            1 SEX M
            1 BIRT
            2 DATE 1950
            1 DEAT
            2 DATE 2020
            0 @I2@ INDI
            1 NAME 李四
            1 SEX F
            1 BIRT
            2 DATE 1952
            0 @F1@ FAM
            1 HUSB @I1@
            1 WIFE @I2@
            0 TRLR
            """;

        // 解析
        ParseResult parsed = parser.parse(new ByteArrayInputStream(original.getBytes(StandardCharsets.UTF_8)));
        assertEquals(2, parsed.persons().size());
        assertEquals(1, parsed.families().size());

        // 转换为 PublicationData
        Map<String, Person> people = new LinkedHashMap<>();
        int i = 0;
        for (GedcomPerson gp : parsed.persons()) {
            String pid = "p" + (++i);
            String gender = switch (gp.sex()) {
                case "M" -> "male";
                case "F" -> "female";
                default -> "unknown";
            };
            people.put(pid, new Person(pid, gp.name(), gender, gp.birthDate(), gp.deathDate(),
                gp.deceased(), null, null, null, gp.note(), null, null, null, null));
        }

        Map<String, FamilyUnit> families = new LinkedHashMap<>();
        families.put("f1", new FamilyUnit("f1", java.util.List.of("p1", "p2"), java.util.List.of(), null));

        PublicationData data = new PublicationData("Round Trip", "", "f1", people, families, null);

        // 导出
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        exporter.export(data, output);
        String exported = output.toString(StandardCharsets.UTF_8);

        // 验证关键信息保留
        assertTrue(exported.contains("1 NAME 张三"));
        assertTrue(exported.contains("1 NAME 李四"));
        assertTrue(exported.contains("2 DATE 1950"));
        assertTrue(exported.contains("2 DATE 2020"));
        assertTrue(exported.contains("1 HUSB @I1@"));
        assertTrue(exported.contains("1 WIFE @I2@"));
    }
}
