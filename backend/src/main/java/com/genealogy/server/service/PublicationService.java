package com.genealogy.server.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.*;
import com.genealogy.server.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class PublicationService {

    private static final Logger log = LoggerFactory.getLogger(PublicationService.class);

    private final PublicationRepository publicationRepository;
    private final PersonRepository personRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final ObjectMapper objectMapper;

    public PublicationService(PublicationRepository publicationRepository, PersonRepository personRepository,
                              FamilyRepository familyRepository, FamilyMemberRepository familyMemberRepository,
                              ObjectMapper objectMapper) {
        this.publicationRepository = publicationRepository;
        this.personRepository = personRepository;
        this.familyRepository = familyRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * 列出用户所有族谱（仅元数据）
     */
    public List<Map<String, Object>> listPublications(Long userId) {
        return publicationRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("title", p.getTitle());
            m.put("subtitle", p.getSubtitle());
            m.put("createdAt", p.getCreatedAt());
            m.put("updatedAt", p.getUpdatedAt());
            if (p.getPublicationInfoJson() != null) {
                try {
                    Map<String, Object> info = objectMapper.readValue(p.getPublicationInfoJson(), new TypeReference<>() {});
                    Object desc = info.get("description");
                    if (desc instanceof String s && !s.isBlank()) {
                        m.put("description", s.length() > 80 ? s.substring(0, 80) + "..." : s);
                    }
                } catch (JsonProcessingException e) {
                    log.warn("族谱 {} 的 info JSON 解析失败: {}", p.getId(), e.getMessage());
                }
            }
            return m;
        }).toList();
    }

    /**
     * 从数据库重建完整的 PublicationData JSON
     */
    public Map<String, Object> loadPublication(Long publicationId) {
        Publication pub = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new NotFoundException("族谱不存在"));

        // 加载所有人物
        List<Person> personEntities = personRepository.findByPublicationId(publicationId);
        Map<String, Long> personDbIdMap = new HashMap<>(); // personId -> dbId
        Map<String, Map<String, Object>> people = new LinkedHashMap<>();
        for (Person p : personEntities) {
            personDbIdMap.put(p.getPersonId(), p.getId());
            Map<String, Object> personJson = new LinkedHashMap<>();
            personJson.put("id", p.getPersonId());
            personJson.put("name", p.getName());
            personJson.put("gender", p.getGender());
            if (p.getBirth() != null) personJson.put("birth", p.getBirth());
            if (p.getDeath() != null) personJson.put("death", p.getDeath());
            if (Boolean.TRUE.equals(p.getDeceased())) personJson.put("deceased", true);
            if (p.getAge() != null) personJson.put("age", p.getAge());
            if (p.getTitleName() != null) personJson.put("titleName", p.getTitleName());
            if (p.getClan() != null) personJson.put("clan", p.getClan());
            if (p.getNote() != null) personJson.put("note", p.getNote());
            if (p.getHighlightRole() != null) personJson.put("highlightRole", p.getHighlightRole());
            if (p.getPhotoId() != null) personJson.put("avatarUrl", "/api/photos/" + p.getPhotoId());
            people.put(p.getPersonId(), personJson);
        }

        // 加载所有家庭
        List<Family> familyEntities = familyRepository.findByPublicationId(publicationId);
        Map<String, Map<String, Object>> families = new LinkedHashMap<>();
        for (Family f : familyEntities) {
            List<FamilyMember> members = familyMemberRepository.findByFamilyDbIdOrderBySortOrder(f.getId());
            List<String> adults = new ArrayList<>();
            List<String> children = new ArrayList<>();
            for (FamilyMember m : members) {
                // 通过 personDbId 找到 personId
                String personId = personDbIdMap.entrySet().stream()
                        .filter(e -> e.getValue().equals(m.getPersonDbId()))
                        .map(Map.Entry::getKey)
                        .findFirst()
                        .orElse(null);
                if (personId == null) continue;
                if ("adult".equals(m.getRole())) adults.add(personId);
                else children.add(personId);
            }
            Map<String, Object> familyJson = new LinkedHashMap<>();
            familyJson.put("id", f.getFamilyId());
            familyJson.put("adults", adults);
            familyJson.put("children", children);
            if (f.getBranchMode() != null) familyJson.put("branchMode", f.getBranchMode());
            families.put(f.getFamilyId(), familyJson);
        }

        // 构建完整的 PublicationData
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("title", pub.getTitle());
        result.put("subtitle", pub.getSubtitle() != null ? pub.getSubtitle() : "");
        result.put("focusFamilyId", pub.getFocusFamilyId() != null ? pub.getFocusFamilyId() : "");
        result.put("people", people);
        result.put("families", families);

        // 解析 info
        if (pub.getPublicationInfoJson() != null) {
            try {
                result.put("info", objectMapper.readValue(pub.getPublicationInfoJson(), new TypeReference<>() {}));
            } catch (JsonProcessingException e) {
                log.warn("族谱 {} 的 info JSON 解析失败: {}", pub.getId(), e.getMessage());
            }
        }

        // 解析 settings
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", pub.getId());
        response.put("publication", result);
        if (pub.getSettingsJson() != null) {
            try {
                response.put("settings", objectMapper.readValue(pub.getSettingsJson(), new TypeReference<>() {}));
            } catch (JsonProcessingException e) {
                response.put("settings", Map.of());
            }
        } else {
            response.put("settings", Map.of());
        }

        return response;
    }

    /**
     * 创建新族谱：将 JSON 分解存入规范化表
     */
    @Transactional
    public Long createPublication(Long userId, String title, String subtitle,
                                   Map<String, Object> publicationData, String settingsJson,
                                   String infoJson) {
        Publication pub = new Publication();
        pub.setUserId(userId);
        pub.setTitle(title != null ? title : "未命名族谱");
        pub.setSubtitle(subtitle != null ? subtitle : "");
        pub.setSettingsJson(settingsJson);
        pub.setPublicationInfoJson(infoJson);

        String focusFamilyId = (String) publicationData.get("focusFamilyId");
        pub.setFocusFamilyId(focusFamilyId);
        pub = publicationRepository.save(pub);

        savePersonsAndFamilies(pub.getId(), publicationData, Map.of());
        return pub.getId();
    }

    /**
     * 更新族谱：删除旧数据，重新写入
     */
    @Transactional
    public void updatePublication(Long publicationId, String title, String subtitle,
                                   Map<String, Object> publicationData, String settingsJson,
                                   String infoJson) {
        Publication pub = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new NotFoundException("族谱不存在"));

        if (title != null) pub.setTitle(title);
        if (subtitle != null) pub.setSubtitle(subtitle);
        pub.setSettingsJson(settingsJson);
        pub.setPublicationInfoJson(infoJson);
        pub.setFocusFamilyId((String) publicationData.get("focusFamilyId"));
        publicationRepository.save(pub);

        // 保存旧的 photoId 映射（personId → photoId）
        Map<String, Long> photoIdMap = new HashMap<>();
        for (Person p : personRepository.findByPublicationId(publicationId)) {
            if (p.getPhotoId() != null) {
                photoIdMap.put(p.getPersonId(), p.getPhotoId());
            }
        }

        // 删除旧数据
        List<Family> oldFamilies = familyRepository.findByPublicationId(publicationId);
        for (Family oldFamily : oldFamilies) {
            familyMemberRepository.deleteByFamilyDbId(oldFamily.getId());
        }
        familyRepository.deleteByPublicationId(publicationId);
        personRepository.deleteByPublicationId(publicationId);

        // 重新写入（保留照片关联）
        savePersonsAndFamilies(publicationId, publicationData, photoIdMap);
    }

    /**
     * 删除族谱：先删子表，再删主表
     */
    @Transactional
    public void deletePublication(Long publicationId) {
        List<Family> families = familyRepository.findByPublicationId(publicationId);
        for (Family family : families) {
            familyMemberRepository.deleteByFamilyDbId(family.getId());
        }
        familyRepository.deleteByPublicationId(publicationId);
        personRepository.deleteByPublicationId(publicationId);
        publicationRepository.deleteById(publicationId);
    }

    // ─── 内部方法 ────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void savePersonsAndFamilies(Long publicationId, Map<String, Object> data, Map<String, Long> photoIdMap) {
        // 保存人物
        Map<String, Long> personIdToDbId = new HashMap<>();
        Map<String, Object> people = (Map<String, Object>) data.get("people");
        if (people != null) {
            for (Map.Entry<String, Object> entry : people.entrySet()) {
                String personId = entry.getKey();
                Map<String, Object> p = (Map<String, Object>) entry.getValue();
                Person entity = new Person();
                entity.setPublicationId(publicationId);
                entity.setPersonId(personId);
                entity.setName((String) p.getOrDefault("name", "未知"));
                entity.setGender((String) p.getOrDefault("gender", "unknown"));
                entity.setBirth((String) p.get("birth"));
                entity.setDeath((String) p.get("death"));
                entity.setDeceased(p.containsKey("deceased") ? (Boolean) p.get("deceased") : false);
                entity.setAge((String) p.get("age"));
                entity.setTitleName((String) p.get("titleName"));
                entity.setClan((String) p.get("clan"));
                entity.setNote((String) p.get("note"));
                entity.setHighlightRole((String) p.get("highlightRole"));
                // 保留照片关联
                if (photoIdMap.containsKey(personId)) {
                    entity.setPhotoId(photoIdMap.get(personId));
                }
                entity = personRepository.save(entity);
                personIdToDbId.put(personId, entity.getId());
            }
        }

        // 保存家庭
        Map<String, Object> families = (Map<String, Object>) data.get("families");
        if (families != null) {
            for (Map.Entry<String, Object> entry : families.entrySet()) {
                String familyId = entry.getKey();
                Map<String, Object> f = (Map<String, Object>) entry.getValue();
                Family familyEntity = new Family();
                familyEntity.setPublicationId(publicationId);
                familyEntity.setFamilyId(familyId);
                familyEntity.setBranchMode((String) f.get("branchMode"));
                familyEntity = familyRepository.save(familyEntity);

                // 保存 adults
                List<String> adults = (List<String>) f.get("adults");
                if (adults != null) {
                    for (int i = 0; i < adults.size(); i++) {
                        Long personDbId = personIdToDbId.get(adults.get(i));
                        if (personDbId == null) continue;
                        FamilyMember fm = new FamilyMember();
                        fm.setFamilyDbId(familyEntity.getId());
                        fm.setPersonDbId(personDbId);
                        fm.setRole("adult");
                        fm.setSortOrder(i);
                        familyMemberRepository.save(fm);
                    }
                }

                // 保存 children
                List<String> children = (List<String>) f.get("children");
                if (children != null) {
                    for (int i = 0; i < children.size(); i++) {
                        Long personDbId = personIdToDbId.get(children.get(i));
                        if (personDbId == null) continue;
                        FamilyMember fm = new FamilyMember();
                        fm.setFamilyDbId(familyEntity.getId());
                        fm.setPersonDbId(personDbId);
                        fm.setRole("child");
                        fm.setSortOrder(i);
                        familyMemberRepository.save(fm);
                    }
                }
            }
        }
    }
}
