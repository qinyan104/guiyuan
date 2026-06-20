package com.genealogy.server.types;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 归源人物的类型化表示
 */
public record Person(
    String id,
    String name,
    String gender,      // "male" / "female" / "unknown"
    String birth,
    String death,
    Boolean deceased,
    String age,
    String titleName,
    String clan,
    String note,
    String highlightRole,
    Boolean isMountPoint,
    Long targetPublicationId,
    Long targetRootPersonId
) {
    public static Person fromMap(String id, Map<String, Object> map) {
        return new Person(
            id,
            (String) map.getOrDefault("name", "Unknown"),
            (String) map.getOrDefault("gender", "unknown"),
            (String) map.get("birth"),
            (String) map.get("death"),
            map.containsKey("deceased") ? (Boolean) map.get("deceased") : null,
            (String) map.get("age"),
            (String) map.get("titleName"),
            (String) map.get("clan"),
            (String) map.get("note"),
            (String) map.get("highlightRole"),
            map.containsKey("isMountPoint") ? (Boolean) map.get("isMountPoint") : null,
            toLong(map.get("targetPublicationId")),
            toLong(map.get("targetRootPersonId"))
        );
    }

    public Map<String, Object> toMap() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", id);
        map.put("name", name);
        map.put("gender", gender);
        if (birth != null) map.put("birth", birth);
        if (death != null) map.put("death", death);
        if (deceased != null) map.put("deceased", deceased);
        if (age != null) map.put("age", age);
        if (titleName != null) map.put("titleName", titleName);
        if (clan != null) map.put("clan", clan);
        if (note != null) map.put("note", note);
        if (highlightRole != null) map.put("highlightRole", highlightRole);
        if (isMountPoint != null) map.put("isMountPoint", isMountPoint);
        if (targetPublicationId != null) map.put("targetPublicationId", targetPublicationId);
        if (targetRootPersonId != null) map.put("targetRootPersonId", targetRootPersonId);
        return map;
    }

    private static Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.longValue();
        if (value instanceof String s && !s.isBlank()) {
            try { return Long.parseLong(s); } catch (NumberFormatException e) { return null; }
        }
        return null;
    }
}
