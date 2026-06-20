package com.genealogy.server.gedcom;

import com.genealogy.server.gedcom.GedcomRecord.GedcomFamily;
import com.genealogy.server.gedcom.GedcomRecord.GedcomPerson;
import com.genealogy.server.types.FamilyUnit;
import com.genealogy.server.types.Person;
import com.genealogy.server.types.PublicationData;

import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * GEDCOM 5.5 导出器
 *
 * 从归源 PublicationData 生成标准 GEDCOM 文本
 */
public class GedcomExporter {

    /**
     * 导出 GEDCOM 文本到输出流
     */
    public void export(PublicationData data, OutputStream output) {
        PrintWriter w = new PrintWriter(new OutputStreamWriter(output, StandardCharsets.UTF_8), true);

        // Header
        w.println("0 HEAD");
        w.println("1 SOUR GUIYUAN");
        w.println("2 VERS 1.0");
        w.println("1 DEST GEDCOM");
        w.println("1 DATE " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("d MMM yyyy")).toUpperCase());
        w.println("1 GEDC");
        w.println("2 VERS 5.5");
        w.println("2 FORM LINEAGE-LINKED");
        w.println("1 CHAR UTF-8");

        // 构建 ID 映射：归源 personId → GEDCOM @I{n}@
        Map<String, String> personIdToGedId = new HashMap<>();
        Map<String, String> familyIdToGedId = new HashMap<>();

        int indiCounter = 0;
        for (String personId : data.people().keySet()) {
            personIdToGedId.put(personId, "I" + (++indiCounter));
        }

        int famCounter = 0;
        for (String familyId : data.families().keySet()) {
            familyIdToGedId.put(familyId, "F" + (++famCounter));
        }

        // 构建反向映射：personId → 所在的 Family 的 GEDCOM ID（作为 adult 或 child）
        Map<String, List<String>> personAsAdult = new HashMap<>();
        Map<String, List<String>> personAsChild = new HashMap<>();

        for (var entry : data.families().entrySet()) {
            String gedFamId = familyIdToGedId.get(entry.getKey());
            FamilyUnit fam = entry.getValue();
            for (String adultId : fam.adults()) {
                personAsAdult.computeIfAbsent(adultId, k -> new java.util.ArrayList<>()).add(gedFamId);
            }
            for (String childId : fam.children()) {
                personAsChild.computeIfAbsent(childId, k -> new java.util.ArrayList<>()).add(gedFamId);
            }
        }

        // 输出 INDI 记录
        for (var entry : data.people().entrySet()) {
            String personId = entry.getKey();
            Person p = entry.getValue();
            String gedId = personIdToGedId.get(personId);

            w.println("0 @" + gedId + "@ INDI");
            if (p.name() != null && !p.name().isBlank()) {
                w.println("1 NAME " + p.name());
            }

            String sex = switch (p.gender() != null ? p.gender() : "unknown") {
                case "male" -> "M";
                case "female" -> "F";
                default -> "U";
            };
            w.println("1 SEX " + sex);

            // 出生
            if (p.birth() != null && !p.birth().isBlank()) {
                w.println("1 BIRT");
                w.println("2 DATE " + p.birth());
            }

            // 去世
            if (Boolean.TRUE.equals(p.deceased()) || (p.death() != null && !p.death().isBlank())) {
                w.println("1 DEAT");
                if (p.death() != null && !p.death().isBlank()) {
                    w.println("2 DATE " + p.death());
                }
            }

            // 头衔/辈分
            if (p.titleName() != null && !p.titleName().isBlank()) {
                w.println("1 TITL " + p.titleName());
            }

            // 堂号
            if (p.clan() != null && !p.clan().isBlank()) {
                w.println("1 _CLAN " + p.clan());
            }

            // 备注
            if (p.note() != null && !p.note().isBlank()) {
                // 多行备注用 CONT
                String[] noteLines = p.note().split("\n", -1);
                w.println("1 NOTE " + noteLines[0]);
                for (int i = 1; i < noteLines.length; i++) {
                    w.println("2 CONT " + noteLines[i]);
                }
            }

            // FAMS（作为配偶的家庭）
            for (String famGedId : personAsAdult.getOrDefault(personId, List.of())) {
                w.println("1 FAMS @" + famGedId + "@");
            }

            // FAMC（作为子女的家庭）
            for (String famGedId : personAsChild.getOrDefault(personId, List.of())) {
                w.println("1 FAMC @" + famGedId + "@");
            }
        }

        // 输出 FAM 记录
        for (var entry : data.families().entrySet()) {
            String familyId = entry.getKey();
            FamilyUnit fam = entry.getValue();
            String gedFamId = familyIdToGedId.get(familyId);

            w.println("0 @" + gedFamId + "@ FAM");

            // adults[0] = HUSB, adults[1] = WIFE（如果有两个成年人）
            if (fam.adults().size() >= 1) {
                String husbGedId = personIdToGedId.get(fam.adults().get(0));
                if (husbGedId != null) w.println("1 HUSB @" + husbGedId + "@");
            }
            if (fam.adults().size() >= 2) {
                String wifeGedId = personIdToGedId.get(fam.adults().get(1));
                if (wifeGedId != null) w.println("1 WIFE @" + wifeGedId + "@");
            }

            for (String childId : fam.children()) {
                String childGedId = personIdToGedId.get(childId);
                if (childGedId != null) w.println("1 CHIL @" + childGedId + "@");
            }
        }

        // Trailer
        w.println("0 TRLR");
        w.flush();
    }
}
