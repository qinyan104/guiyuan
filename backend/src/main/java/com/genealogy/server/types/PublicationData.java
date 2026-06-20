package com.genealogy.server.types;

import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

/**
 * 归源族谱数据的类型化表示（用于 GEDCOM 导入/导出等场景）
 * 与前端 TypeScript PublicationData 对应
 */
public record PublicationData(
    String title,
    String subtitle,
    String focusFamilyId,
    Map<String, Person> people,
    Map<String, FamilyUnit> families,
    Map<String, Object> info
) {
    public PublicationData {
        if (people == null) people = new LinkedHashMap<>();
        if (families == null) families = new LinkedHashMap<>();
    }

    /**
     * 从 Map<String, Object> 构建
     */
    @SuppressWarnings("unchecked")
    public static PublicationData fromMap(Map<String, Object> map) {
        String title = (String) map.getOrDefault("title", "未命名族谱");
        String subtitle = (String) map.getOrDefault("subtitle", "");
        String focusFamilyId = (String) map.getOrDefault("focusFamilyId", "");

        Map<String, Person> people = new LinkedHashMap<>();
        Map<String, Object> peopleMap = (Map<String, Object>) map.get("people");
        if (peopleMap != null) {
            for (var entry : peopleMap.entrySet()) {
                people.put(entry.getKey(), Person.fromMap(entry.getKey(), (Map<String, Object>) entry.getValue()));
            }
        }

        Map<String, FamilyUnit> families = new LinkedHashMap<>();
        Map<String, Object> familiesMap = (Map<String, Object>) map.get("families");
        if (familiesMap != null) {
            for (var entry : familiesMap.entrySet()) {
                families.put(entry.getKey(), FamilyUnit.fromMap(entry.getKey(), (Map<String, Object>) entry.getValue()));
            }
        }

        Map<String, Object> info = (Map<String, Object>) map.get("info");

        return new PublicationData(title, subtitle, focusFamilyId, people, families, info);
    }

    /**
     * 转换为 Map<String, Object>（兼容现有 API）
     */
    public Map<String, Object> toMap() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("title", title);
        map.put("subtitle", subtitle);
        map.put("focusFamilyId", focusFamilyId);

        Map<String, Object> peopleMap = new LinkedHashMap<>();
        for (var entry : people.entrySet()) {
            peopleMap.put(entry.getKey(), entry.getValue().toMap());
        }
        map.put("people", peopleMap);

        Map<String, Object> familiesMap = new LinkedHashMap<>();
        for (var entry : families.entrySet()) {
            familiesMap.put(entry.getKey(), entry.getValue().toMap());
        }
        map.put("families", familiesMap);

        if (info != null) map.put("info", info);
        return map;
    }
}
