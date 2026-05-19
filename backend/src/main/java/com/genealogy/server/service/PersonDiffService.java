package com.genealogy.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.model.Person;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PersonDiffService {

    private final ObjectMapper objectMapper;

    public PersonDiffService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /** @deprecated use {@link PublicationService.SaveResult#personDiff()} from updatePublication/updatePerson instead */
    @Deprecated
    public String getLastPersonDiff() { return null; }

    @SuppressWarnings("unchecked")
    public String computePersonDiff(Map<String, Object> people, Map<String, Person> dbPersonCache) {
        if (people == null || people.isEmpty()) return "[]";
        if (dbPersonCache == null || dbPersonCache.isEmpty()) return "[]";

        List<Map<String, Object>> personChanges = new ArrayList<>();

        for (Map.Entry<String, Object> entry : people.entrySet()) {
            if (personChanges.size() >= 50) break;

            String personId = entry.getKey();
            Map<String, Object> incoming = (Map<String, Object>) entry.getValue();
            Person existing = dbPersonCache.get(personId);
            if (existing == null) continue;

            List<Map<String, String>> fieldChanges = new ArrayList<>();

            diffField(fieldChanges, "name", "姓名", existing.getName(), (String) incoming.get("name"));
            diffField(fieldChanges, "gender", "性别", existing.getGender(), (String) incoming.get("gender"));
            diffField(fieldChanges, "birth", "出生", existing.getBirth(), (String) incoming.get("birth"));
            diffField(fieldChanges, "death", "去世", existing.getDeath(), (String) incoming.get("death"));
            diffField(fieldChanges, "deceased", "在世",
                    existing.getDeceased() != null ? String.valueOf(existing.getDeceased()) : null,
                    incoming.get("deceased") != null ? String.valueOf(incoming.get("deceased")) : null);
            diffField(fieldChanges, "age", "年龄", existing.getAge(), (String) incoming.get("age"));
            diffField(fieldChanges, "titleName", "字/号", existing.getTitleName(), (String) incoming.get("titleName"));
            diffField(fieldChanges, "clan", "氏族", existing.getClan(), (String) incoming.get("clan"));
            diffField(fieldChanges, "note", "备注", existing.getNote(), (String) incoming.get("note"));
            diffAvatarField(fieldChanges, existing.getPhotoId(), (String) incoming.get("avatarUrl"));

            if (!fieldChanges.isEmpty()) {
                Map<String, Object> changeEntry = new LinkedHashMap<>();
                changeEntry.put("personName", existing.getName() != null ? existing.getName() : personId);
                changeEntry.put("personId", personId);
                int limit = Math.min(fieldChanges.size(), 10);
                changeEntry.put("changes", new ArrayList<>(fieldChanges.subList(0, limit)));
                personChanges.add(changeEntry);
            }
        }

        try {
            String json = objectMapper.writeValueAsString(personChanges);
            if (json.length() > 500) {
                personChanges.remove(personChanges.size() - 1);
                json = objectMapper.writeValueAsString(personChanges);
                if (json.length() > 500) return "[]";
            }
            return json;
        } catch (Exception e) {
            return "[]";
        }
    }

    public String computeSinglePersonDiff(Person existing, Map<String, Object> body, String personId) {
        List<Map<String, String>> changes = new ArrayList<>();
        if (body.containsKey("name")) {
            diffField(changes, "name", "姓名", existing.getName(), (String) body.get("name"));
        }
        if (body.containsKey("gender")) {
            diffField(changes, "gender", "性别", existing.getGender(), (String) body.get("gender"));
        }
        if (body.containsKey("birth")) {
            diffField(changes, "birth", "出生", existing.getBirth(), (String) body.get("birth"));
        }
        if (body.containsKey("death")) {
            diffField(changes, "death", "去世", existing.getDeath(), (String) body.get("death"));
        }
        if (body.containsKey("deceased")) {
            diffField(changes, "deceased", "在世",
                    existing.getDeceased() != null ? String.valueOf(existing.getDeceased()) : null,
                    body.get("deceased") != null ? String.valueOf(body.get("deceased")) : null);
        }
        if (body.containsKey("age")) {
            diffField(changes, "age", "年龄", existing.getAge(), (String) body.get("age"));
        }
        if (body.containsKey("titleName")) {
            diffField(changes, "titleName", "字/号", existing.getTitleName(), (String) body.get("titleName"));
        }
        if (body.containsKey("clan")) {
            diffField(changes, "clan", "氏族", existing.getClan(), (String) body.get("clan"));
        }
        if (body.containsKey("note")) {
            diffField(changes, "note", "备注", existing.getNote(), (String) body.get("note"));
        }
        if (body.containsKey("avatarUrl")) {
            diffAvatarField(changes, existing.getPhotoId(), (String) body.get("avatarUrl"));
        }

        if (changes.isEmpty()) return "[]";

        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("personName", existing.getName() != null ? existing.getName() : personId);
        entry.put("personId", personId);
        entry.put("changes", changes);

        try {
            return objectMapper.writeValueAsString(List.of(entry));
        } catch (Exception e) {
            return "[]";
        }
    }

    void diffField(List<Map<String, String>> changes, String field, String label,
            String oldVal, String newVal) {
        String o = oldVal != null ? oldVal : "";
        String n = newVal != null ? newVal : "";
        if (!o.equals(n)) {
            Map<String, String> c = new LinkedHashMap<>();
            c.put("field", field);
            c.put("fieldLabel", label);
            c.put("old", o);
            c.put("new", n);
            changes.add(c);
        }
    }

    void diffAvatarField(List<Map<String, String>> changes, Long oldPhotoId, String newAvatarUrl) {
        String o = oldPhotoId != null ? "已有头像" : "";
        String n = (newAvatarUrl != null && !newAvatarUrl.isEmpty()) ? "已更新" : "";
        if (!o.equals(n)) {
            Map<String, String> c = new LinkedHashMap<>();
            c.put("field", "avatarUrl");
            c.put("fieldLabel", "头像");
            c.put("old", o);
            c.put("new", n.isEmpty() ? "已移除" : "已更新");
            changes.add(c);
        }
    }
}
