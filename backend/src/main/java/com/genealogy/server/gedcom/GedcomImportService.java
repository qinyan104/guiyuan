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
     * 策略：添加 GEDCOM 中的新人物和新家庭，跳过已存在的
     */
    @Transactional
    public ImportResult mergeIntoPublication(InputStream file, Long pubId) throws IOException {
        ParseResult parsed = parser.parse(file);
        PublicationData gedcomData = convertToPublicationData(parsed);

        // 加载现有数据
        Map<String, Object> existingMap = publicationService.loadPublication(pubId);
        @SuppressWarnings("unchecked")
        Map<String, Object> pubJson = (Map<String, Object>) existingMap.get("publication");
        PublicationData existing = PublicationData.fromMap(pubJson);

        // 合并：添加不存在的人物和家庭
        int newPersons = 0;
        int newFamilies = 0;

        for (var entry : gedcomData.people().entrySet()) {
            String key = entry.getKey();
            if (!existing.people().containsKey(key)) {
                existing.people().put(key, entry.getValue());
                newPersons++;
            }
        }

        for (var entry : gedcomData.families().entrySet()) {
            String key = entry.getKey();
            if (!existing.families().containsKey(key)) {
                existing.families().put(key, entry.getValue());
                newFamilies++;
            }
        }

        // 更新现有族谱
        @SuppressWarnings("unchecked")
        Map<String, Object> settings = (Map<String, Object>) existingMap.get("settings");
        String settingsJson = settings != null ? objectMapper.writeValueAsString(settings) : defaultSettingsJson();
        String infoJson = existing.info() != null ? objectMapper.writeValueAsString(existing.info()) : null;

        publicationService.updatePublication(
            pubId,
            (Long) existingMap.get("revision"),
            existing.title(),
            existing.subtitle(),
            existing.toMap(),
            settingsJson,
            infoJson
        );

        List<String> warnings = new ArrayList<>(parsed.warnings());
        warnings.add(0, String.format("合并完成：新增 %d 个人物，%d 个家庭", newPersons, newFamilies));

        return new ImportResult(pubId, newPersons, newFamilies, warnings);
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
