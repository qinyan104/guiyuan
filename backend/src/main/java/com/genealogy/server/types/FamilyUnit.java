package com.genealogy.server.types;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 归源家庭单元的类型化表示
 */
public record FamilyUnit(
    String id,
    List<String> adults,
    List<String> children,
    String branchMode   // "married-out" / "uxorilocal" / null
) {
    public FamilyUnit {
        if (adults == null) adults = new ArrayList<>();
        if (children == null) children = new ArrayList<>();
    }

    @SuppressWarnings("unchecked")
    public static FamilyUnit fromMap(String id, Map<String, Object> map) {
        List<String> adults = (List<String>) map.getOrDefault("adults", List.of());
        List<String> children = (List<String>) map.getOrDefault("children", List.of());
        String branchMode = (String) map.get("branchMode");
        return new FamilyUnit(id, new ArrayList<>(adults), new ArrayList<>(children), branchMode);
    }

    public Map<String, Object> toMap() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", id);
        map.put("adults", adults);
        map.put("children", children);
        if (branchMode != null) map.put("branchMode", branchMode);
        return map;
    }
}
