package com.genealogy.server.gedcom;

import com.genealogy.server.gedcom.GedcomRecord.GedcomFamily;
import com.genealogy.server.gedcom.GedcomRecord.GedcomPerson;
import com.genealogy.server.gedcom.GedcomRecord.ParseResult;
import com.genealogy.server.service.DataValidationService;
import com.genealogy.server.service.PublicationService;
import com.genealogy.server.types.FamilyUnit;
import com.genealogy.server.types.Person;
import com.genealogy.server.types.PublicationData;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

/**
 * GEDCOM 导入服务
 *
 * 流程：解析 GEDCOM → 构建 PublicationData → 校验 → 写入数据库
 */
@Service
public class GedcomImportService {

    private static final Logger log = LoggerFactory.getLogger(GedcomImportService.class);

    private final GedcomParser parser = new GedcomParser();
    private final PublicationService publicationService;
    private final ObjectMapper objectMapper;

    public GedcomImportService(PublicationService publicationService, ObjectMapper objectMapper) {
        this.publicationService = publicationService;
        this.objectMapper = objectMapper;
    }

    public record ImportResult(
        Long pubId,
        int personCount,
        int familyCount,
        List<String> warnings
    ) {}

    /**
     * 导入 GEDCOM 文件为新族谱
     */
    @Transactional
    public ImportResult importAsNewPublication(InputStream file, Long userId) throws IOException {
        ParseResult parsed = parser.parse(file);
        PublicationData data = convertToPublicationData(parsed);

        // 校验
        validate(data);

        // 序列化 settings 和 info
        String settingsJson = defaultSettingsJson();
        String infoJson = buildInfoJson(data.title());

        // 写入数据库
        Long pubId = publicationService.createPublication(
            userId,
            data.title(),
            data.subtitle(),
            data.toMap(),
            settingsJson,
            infoJson
        );

        log.info("GEDCOM 导入完成: pubId={}, {} 人, {} 家庭, {} 条警告",
            pubId, data.people().size(), data.families().size(), parsed.warnings().size());

        return new ImportResult(pubId, data.people().size(), data.families().size(), parsed.warnings());
    }

    /**
     * 合并导入 GEDCOM 到现有族谱
     * 文件内编号不代表跨文件人物身份，导入的人物和家庭全部分配新编号。
     */
    @Transactional
    public ImportResult mergeIntoPublication(InputStream file, Long pubId) throws IOException {
        ParseResult parsed = parser.parse(file);
        PublicationData gedcomData = convertToPublicationData(parsed);

        // 加载现有数据
        Map<String, Object> existingMap = publicationService.loadPublication(pubId);
        @SuppressWarnings("unchecked")
        Map<String, Object> pubJson = (Map<String, Object>) existingMap.get("publication");
        @SuppressWarnings("unchecked")
        Map<String, Object> people = (Map<String, Object>) pubJson.get("people");
        @SuppressWarnings("unchecked")
        Map<String, Object> families = (Map<String, Object>) pubJson.get("families");
        Map<String, String> personIds = allocateImportIds(people.keySet(), gedcomData.people().keySet(), "p");
        Map<String, String> familyIds = allocateImportIds(families.keySet(), gedcomData.families().keySet(), "f");

        // Preserve existing maps, including photo and mount-point metadata.
        // ponytail: imports append records; cross-file person matching requires explicit review.
        gedcomData.people().forEach((id, person) -> {
            Map<String, Object> data = person.toMap();
            data.put("id", personIds.get(id));
            people.put(personIds.get(id), data);
        });
        gedcomData.families().forEach((id, family) -> {
            String familyId = familyIds.get(id);
            families.put(familyId, new FamilyUnit(familyId,
                    family.adults().stream().map(personIds::get).toList(),
                    family.children().stream().map(personIds::get).toList(),
                    family.branchMode()).toMap());
        });
        int newPersons = gedcomData.people().size();
        int newFamilies = gedcomData.families().size();

        // 更新现有族谱
        @SuppressWarnings("unchecked")
        Map<String, Object> settings = (Map<String, Object>) existingMap.get("settings");
        String settingsJson = settings != null ? objectMapper.writeValueAsString(settings) : defaultSettingsJson();
        String infoJson = pubJson.get("info") != null ? objectMapper.writeValueAsString(pubJson.get("info")) : null;

        publicationService.updatePublication(
            pubId,
            (Long) existingMap.get("revision"),
            (String) pubJson.get("title"),
            (String) pubJson.get("subtitle"),
            pubJson,
            settingsJson,
            infoJson
        );

        List<String> warnings = new ArrayList<>(parsed.warnings());
        warnings.add(0, String.format("合并完成：新增 %d 个人物，%d 个家庭", newPersons, newFamilies));

        return new ImportResult(pubId, newPersons, newFamilies, warnings);
    }

    private Map<String, String> allocateImportIds(Set<String> existingIds, Set<String> importedIds, String prefix) {
        Map<String, String> mapping = new LinkedHashMap<>();
        int counter = 0;
        for (String id : importedIds) {
            String nextId;
            do {
                nextId = prefix + (++counter);
            } while (existingIds.contains(nextId));
            mapping.put(id, nextId);
        }
        return mapping;
    }

    /**
     * 将 GEDCOM 解析结果转换为归源 PublicationData
     */
    private PublicationData convertToPublicationData(ParseResult parsed) {
        Map<String, Person> people = new LinkedHashMap<>();
        Map<String, FamilyUnit> families = new LinkedHashMap<>();

        // 构建 GEDCOM ID → 归源 personId 的映射
        // 归源 personId 格式：p1, p2, p3...
        Map<String, String> gedIdToPersonId = new LinkedHashMap<>();
        int personCounter = 0;
        for (GedcomPerson gp : parsed.persons()) {
            String personId = "p" + (++personCounter);
            gedIdToPersonId.put(gp.id(), personId);

            String gender = switch (gp.sex() != null ? gp.sex() : "U") {
                case "M" -> "male";
                case "F" -> "female";
                default -> "unknown";
            };

            people.put(personId, new Person(
                personId,
                gp.name(),
                gender,
                gp.birthDate(),
                gp.deathDate(),
                gp.deceased() || (gp.deathDate() != null && !gp.deathDate().isBlank()),
                null, // age
                gp.titleName(),
                gp.clan(),
                gp.note(),
                null, // highlightRole
                null, // isMountPoint
                null, // targetPublicationId
                null  // targetRootPersonId
            ));
        }

        // 构建家庭
        // 策略1：如果有 FAM 记录，直接使用
        // 策略2：如果没有 FAM 但有 FAMS/FAMC 引用，从引用中构建
        if (!parsed.families().isEmpty()) {
            // 有 FAM 记录
            int familyCounter = 0;
            for (GedcomFamily gf : parsed.families()) {
                String familyId = "f" + (++familyCounter);
                List<String> adults = new ArrayList<>();
                if (gf.husbandId() != null) {
                    String pid = gedIdToPersonId.get(gf.husbandId());
                    if (pid != null) adults.add(pid);
                }
                if (gf.wifeId() != null) {
                    String pid = gedIdToPersonId.get(gf.wifeId());
                    if (pid != null) adults.add(pid);
                }
                List<String> children = gf.childrenIds().stream()
                    .map(gedIdToPersonId::get)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

                if (!adults.isEmpty() || !children.isEmpty()) {
                    families.put(familyId, new FamilyUnit(familyId, adults, children, null));
                }
            }
        } else {
            // 没有 FAM 记录，从 FAMS/FAMC 引用中重建
            buildFamiliesFromReferences(parsed, gedIdToPersonId, families);
        }

        // 确定 focusFamilyId
        String focusFamilyId = families.isEmpty() ? "" : families.keySet().iterator().next();

        // 标题
        String title = "GEDCOM 导入 - " + people.size() + " 人";

        return new PublicationData(title, "", focusFamilyId, people, families, null);
    }

    /**
     * 从 FAMS/FAMC 引用中重建家庭结构
     * 适用于没有 FAM 记录的 GEDCOM 文件
     */
    private void buildFamiliesFromReferences(ParseResult parsed,
            Map<String, String> gedIdToPersonId,
            Map<String, FamilyUnit> families) {
        // 收集所有 FAMS 引用，将同一家庭的配偶和子女关联
        Map<String, List<String>> famsGroups = new LinkedHashMap<>(); // FAMS ref → [personIds]
        Map<String, List<String>> famcGroups = new LinkedHashMap<>(); // FAMC ref → [personIds]

        for (GedcomPerson gp : parsed.persons()) {
            String pid = gedIdToPersonId.get(gp.id());
            if (pid == null) continue;

            for (String famsRef : gp.familySpouseIds()) {
                famsGroups.computeIfAbsent(famsRef, k -> new ArrayList<>()).add(pid);
            }
            for (String famcRef : gp.familyChildIds()) {
                famcGroups.computeIfAbsent(famcRef, k -> new ArrayList<>()).add(pid);
            }
        }

        // 合并 FAMS 和 FAMC 引用
        Set<String> allRefs = new LinkedHashSet<>();
        allRefs.addAll(famsGroups.keySet());
        allRefs.addAll(famcGroups.keySet());

        int familyCounter = 0;
        for (String ref : allRefs) {
            String familyId = "f" + (++familyCounter);
            List<String> adults = famsGroups.getOrDefault(ref, List.of());
            List<String> children = famcGroups.getOrDefault(ref, List.of());

            if (!adults.isEmpty() || !children.isEmpty()) {
                families.put(familyId, new FamilyUnit(familyId, new ArrayList<>(adults), new ArrayList<>(children), null));
            }
        }

        // 处理完全没有引用的孤儿人物：创建单人家庭
        Set<String> referencedPersonIds = new HashSet<>();
        for (FamilyUnit fam : families.values()) {
            referencedPersonIds.addAll(fam.adults());
            referencedPersonIds.addAll(fam.children());
        }

        for (GedcomPerson gp : parsed.persons()) {
            String pid = gedIdToPersonId.get(gp.id());
            if (pid != null && !referencedPersonIds.contains(pid)) {
                String familyId = "f" + (++familyCounter);
                families.put(familyId, new FamilyUnit(familyId, List.of(pid), List.of(), null));
            }
        }
    }

    /**
     * 数据校验
     */
    private void validate(PublicationData data) {
        // 构建 childToParent 映射用于循环检测
        Map<String, String> childToParent = new HashMap<>();
        for (FamilyUnit fam : data.families().values()) {
            if (!fam.adults().isEmpty()) {
                for (String childId : fam.children()) {
                    childToParent.putIfAbsent(childId, fam.adults().get(0));
                }
            }
        }
        DataValidationService.checkCircularAncestry(childToParent);

        // 校验每个人物的日期
        for (Person person : data.people().values()) {
            DataValidationService.validatePersonDates(person.toMap());
            DataValidationService.validatePersonLifeStatus(person.toMap());
        }
    }

    private String defaultSettingsJson() {
        try {
            Map<String, Object> settings = new LinkedHashMap<>();
            settings.put("paper", "A4");
            settings.put("layoutMode", "modern");
            settings.put("cardWidth", 156);
            settings.put("generationGap", 160);
            settings.put("siblingGap", 80);
            settings.put("partnerGap", 96);
            settings.put("fontScale", 1.0);
            settings.put("zoom", 0.75);
            settings.put("showCard", true);
            settings.put("showBirth", true);
            settings.put("showDeath", true);
            settings.put("showAge", false);
            settings.put("showNote", false);
            settings.put("showStatus", true);
            settings.put("showLineage", false);
            settings.put("showPhoto", true);
            settings.put("paddingX", 120);
            settings.put("paddingY", 80);
            return objectMapper.writeValueAsString(settings);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    private String buildInfoJson(String title) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                "description", "通过 GEDCOM 文件导入"
            ));
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }
}
