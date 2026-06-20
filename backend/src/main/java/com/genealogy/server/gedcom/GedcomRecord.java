package com.genealogy.server.gedcom;

import java.util.ArrayList;
import java.util.List;

/**
 * GEDCOM 解析中间态数据结构
 */
public final class GedcomRecord {

    private GedcomRecord() {}

    /**
     * GEDCOM 解析结果
     */
    public record ParseResult(
        List<GedcomPerson> persons,
        List<GedcomFamily> families,
        List<String> warnings
    ) {
        public ParseResult {
            if (persons == null) persons = new ArrayList<>();
            if (families == null) families = new ArrayList<>();
            if (warnings == null) warnings = new ArrayList<>();
        }

        public ParseResult() {
            this(new ArrayList<>(), new ArrayList<>(), new ArrayList<>());
        }
    }

    /**
     * GEDCOM 人物记录
     */
    public record GedcomPerson(
        String id,               // GEDCOM ID, e.g. @I1@
        String name,
        String sex,              // M / F / U
        String birthDate,
        String birthPlace,
        String deathDate,
        String deathPlace,
        boolean deceased,
        String note,
        String titleName,
        String clan,
        List<String> familySpouseIds,  // FAMS references
        List<String> familyChildIds    // FAMC references
    ) {
        public GedcomPerson {
            if (familySpouseIds == null) familySpouseIds = new ArrayList<>();
            if (familyChildIds == null) familyChildIds = new ArrayList<>();
        }
    }

    /**
     * GEDCOM 家庭记录
     */
    public record GedcomFamily(
        String id,               // GEDCOM ID, e.g. @F1@
        String husbandId,        // HUSB reference
        String wifeId,           // WIFE reference
        List<String> childrenIds, // CHIL references
        String note
    ) {
        public GedcomFamily {
            if (childrenIds == null) childrenIds = new ArrayList<>();
        }
    }

    /**
     * 解析中间态：正在构建的人物记录
     */
    public static class PersonBuilder {
        String id;
        String name;
        String sex = "U";
        String birthDate;
        String birthPlace;
        String deathDate;
        String deathPlace;
        boolean deceased;
        String note;
        StringBuilder noteBuilder; // 用于 CONT/CONC 多行拼接
        String titleName;
        String clan;
        final List<String> familySpouseIds = new ArrayList<>();
        final List<String> familyChildIds = new ArrayList<>();

        public GedcomPerson build() {
            // 将 StringBuilder 的最终内容写回 note
            if (noteBuilder != null) {
                note = noteBuilder.toString();
            }
            return new GedcomPerson(id, name, sex, birthDate, birthPlace,
                deathDate, deathPlace, deceased, note, titleName, clan,
                familySpouseIds, familyChildIds);
        }
    }

    /**
     * 解析中间态：正在构建的家庭记录
     */
    public static class FamilyBuilder {
        String id;
        String husbandId;
        String wifeId;
        final List<String> childrenIds = new ArrayList<>();
        String note;

        public GedcomFamily build() {
            return new GedcomFamily(id, husbandId, wifeId, childrenIds, note);
        }
    }
}
