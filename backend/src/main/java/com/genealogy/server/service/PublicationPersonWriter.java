package com.genealogy.server.service;

import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.model.Family;
import com.genealogy.server.model.FamilyMember;
import com.genealogy.server.model.Person;
import com.genealogy.server.repository.FamilyMemberRepository;
import com.genealogy.server.repository.FamilyRepository;
import com.genealogy.server.repository.PersonRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 人员与家庭实体的持久化及挂载点元数据处理。
 *
 * <p>本类从 {@link PublicationService} 中拆分而来。这部分逻辑构成一个自包含闭包：
 * 仅依赖 person / family / familyMember 三个仓储与 {@link PhotoService}，
 * 不涉及出版物本身、权限校验、版本比对与差异计算，
 * 因此可以独立于写用例的生命周期演进。
 *
 * <p>调用方需自行保证事务边界与版本校验。
 */
@Service
public class PublicationPersonWriter {

    private final PersonRepository personRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final PhotoService photoService;

    public PublicationPersonWriter(PersonRepository personRepository,
                                   FamilyRepository familyRepository,
                                   FamilyMemberRepository familyMemberRepository,
                                   PhotoService photoService) {
        this.personRepository = personRepository;
        this.familyRepository = familyRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.photoService = photoService;
    }

    /**
     * 以给定数据为准，对出版物下的人员与家庭做增量对齐。
     *
     * <p>语义为「全量覆盖」：数据中未出现的人员与家庭会被删除，
     * 家庭成员仅在集合发生变化时才重建，避免无谓的写入。
     *
     * @param existingPersons        当前已存在的人员（创建场景传空集合）
     * @param existingFamilies       当前已存在的家庭（创建场景传空集合）
     * @param cloneReferencedPhotos  是否克隆被引用的照片；首次导入时为 true
     */
    @SuppressWarnings("unchecked")
    public void savePersonsAndFamilies(Long publicationId, Map<String, Object> data,
                                       List<Person> existingPersons, List<Family> existingFamilies,
                                       boolean cloneReferencedPhotos) {
        validatePublicationData(data);

        Map<String, Person> remainingPeople = new HashMap<>();
        for (Person person : existingPersons) {
            remainingPeople.put(person.getPersonId(), person);
        }
        Map<String, Long> personIdToDbId = new HashMap<>();
        Map<String, Object> people = (Map<String, Object>) data.get("people");
        if (people != null) {
            for (Map.Entry<String, Object> entry : people.entrySet()) {
                String personId = entry.getKey();
                Map<String, Object> personData = (Map<String, Object>) entry.getValue();

                Person entity = remainingPeople.remove(personId);
                boolean isNew = entity == null;
                if (isNew) {
                    entity = new Person();
                    entity.setPublicationId(publicationId);
                    entity.setPersonId(personId);
                }
                entity.setName((String) personData.getOrDefault("name", "Unknown"));
                entity.setGender((String) personData.getOrDefault("gender", "unknown"));
                entity.setBirth((String) personData.get("birth"));
                String death = (String) personData.get("death");
                entity.setDeath(death);
                boolean deceasedFromData = personData.containsKey("deceased")
                        && Boolean.TRUE.equals(personData.get("deceased"));
                entity.setDeceased(death != null && !death.isBlank() || deceasedFromData);
                entity.setAge((String) personData.get("age"));
                entity.setTitleName((String) personData.get("titleName"));
                entity.setClan((String) personData.get("clan"));
                entity.setNote((String) personData.get("note"));
                entity.setHighlightRole((String) personData.get("highlightRole"));
                applyMountPointMetadata(entity, personData);

                if (isNew) {
                    entity = personRepository.save(entity);
                }
                personIdToDbId.put(personId, entity.getId());

                if (personData.containsKey("avatarUrl")) {
                    String avatarUrl = (String) personData.get("avatarUrl");
                    String currentAvatarUrl = entity.getPhotoId() == null ? null : "/api/photos/" + entity.getPhotoId();
                    if (avatarUrl != null && !avatarUrl.equals(currentAvatarUrl)) {
                        Long photoId = photoService.handlePersonAvatar(
                                entity.getId(), avatarUrl, cloneReferencedPhotos);
                        if (photoId != null) {
                            entity.setPhotoId(photoId);
                            personRepository.save(entity);
                        }
                    }
                }
            }
        }

        Map<Long, List<FamilyMember>> membersByFamilyId = new HashMap<>();
        if (!existingFamilies.isEmpty()) {
            List<Long> familyDbIds = existingFamilies.stream().map(Family::getId).toList();
            for (FamilyMember member : familyMemberRepository
                    .findByFamilyDbIdInOrderByFamilyDbIdAscSortOrderAsc(familyDbIds)) {
                membersByFamilyId.computeIfAbsent(member.getFamilyDbId(), ignored -> new ArrayList<>()).add(member);
            }
        }

        Map<String, Family> remainingFamilies = new HashMap<>();
        for (Family family : existingFamilies) {
            remainingFamilies.put(family.getFamilyId(), family);
        }

        Map<String, Object> families = (Map<String, Object>) data.get("families");
        if (families != null) {
            for (Map.Entry<String, Object> entry : families.entrySet()) {
                String familyId = entry.getKey();
                Map<String, Object> familyData = (Map<String, Object>) entry.getValue();

                Family familyEntity = remainingFamilies.remove(familyId);
                boolean isNew = familyEntity == null;
                if (isNew) {
                    familyEntity = new Family();
                    familyEntity.setPublicationId(publicationId);
                    familyEntity.setFamilyId(familyId);
                }
                familyEntity.setBranchMode((String) familyData.get("branchMode"));
                if (isNew) {
                    familyEntity = familyRepository.save(familyEntity);
                }

                List<FamilyMember> desiredMembers = new ArrayList<>();
                collectMembers(desiredMembers, familyEntity.getId(), familyData.get("adults"), "adult", personIdToDbId);
                collectMembers(desiredMembers, familyEntity.getId(), familyData.get("children"), "child", personIdToDbId);

                List<FamilyMember> currentMembers = membersByFamilyId.getOrDefault(familyEntity.getId(), List.of());
                if (!sameFamilyMembers(currentMembers, desiredMembers)) {
                    if (!currentMembers.isEmpty()) {
                        familyMemberRepository.deleteByFamilyDbId(familyEntity.getId());
                    }
                    familyMemberRepository.saveAll(desiredMembers);
                }
            }
        }

        for (Family family : remainingFamilies.values()) {
            if (!membersByFamilyId.getOrDefault(family.getId(), List.of()).isEmpty()) {
                familyMemberRepository.deleteByFamilyDbId(family.getId());
            }
        }
        familyRepository.deleteAll(remainingFamilies.values());
        personRepository.deleteAll(remainingPeople.values());
    }

    @SuppressWarnings("unchecked")
    private void collectMembers(List<FamilyMember> target, Long familyDbId, Object rawIds,
                                String role, Map<String, Long> personIdToDbId) {
        if (!(rawIds instanceof List<?> ids)) {
            return;
        }
        for (int i = 0; i < ids.size(); i++) {
            Long personDbId = personIdToDbId.get(ids.get(i));
            if (personDbId == null) {
                continue;
            }
            FamilyMember member = new FamilyMember();
            member.setFamilyDbId(familyDbId);
            member.setPersonDbId(personDbId);
            member.setRole(role);
            member.setSortOrder(i);
            target.add(member);
        }
    }

    private boolean sameFamilyMembers(List<FamilyMember> current, List<FamilyMember> desired) {
        if (current.size() != desired.size()) {
            return false;
        }
        List<String> currentKeys = current.stream().map(this::familyMemberKey).sorted().toList();
        List<String> desiredKeys = desired.stream().map(this::familyMemberKey).sorted().toList();
        return currentKeys.equals(desiredKeys);
    }

    private String familyMemberKey(FamilyMember member) {
        return member.getRole() + ":" + member.getPersonDbId() + ":" + member.getSortOrder();
    }

    /**
     * 校验人员与家庭数据的一致性。
     *
     * <p>拒绝同一人同时出现在多个家庭的父母或子女位置，
     * 并检查是否存在环状世系。
     */
    @SuppressWarnings("unchecked")
    public void validatePublicationData(Map<String, Object> data) {
        Map<String, Object> people = (Map<String, Object>) data.get("people");
        if (people != null) {
            for (Object value : people.values()) {
                Map<String, Object> person = (Map<String, Object>) value;
                DataValidationService.validatePersonDates(person);
                DataValidationService.validatePersonLifeStatus(person);
            }
        }

        Map<String, Object> families = (Map<String, Object>) data.get("families");
        if (families == null) {
            return;
        }

        Map<String, List<String>> adultToFamilies = new HashMap<>();
        Map<String, List<String>> childToFamilies = new HashMap<>();
        Map<String, String> childToParent = new HashMap<>();

        for (Map.Entry<String, Object> entry : families.entrySet()) {
            Map<String, Object> familyData = (Map<String, Object>) entry.getValue();
            List<String> adults = (List<String>) familyData.getOrDefault("adults", List.of());
            List<String> children = (List<String>) familyData.getOrDefault("children", List.of());
            for (String adultId : adults) {
                adultToFamilies.computeIfAbsent(adultId, ignored -> new ArrayList<>()).add(entry.getKey());
            }
            for (String childId : children) {
                childToFamilies.computeIfAbsent(childId, ignored -> new ArrayList<>()).add(entry.getKey());
                if (!adults.isEmpty()) {
                    childToParent.putIfAbsent(childId, adults.get(0));
                }
            }
        }

        List<String> errors = new ArrayList<>();
        adultToFamilies.forEach((personId, familyIds) -> {
            if (familyIds.size() > 1) {
                errors.add("人物 " + personId + " 不能同时作为多个家庭的父母：" + String.join(", ", familyIds));
            }
        });
        childToFamilies.forEach((personId, familyIds) -> {
            if (familyIds.size() > 1) {
                errors.add("人物 " + personId + " 不能同时作为多个家庭的子女：" + String.join(", ", familyIds));
            }
        });
        if (!errors.isEmpty()) {
            throw new BadRequestException("数据校验失败：" + String.join("; ", errors));
        }
        DataValidationService.checkCircularAncestry(childToParent);
    }

    /**
     * 根据前端提交的数据设置人员的挂载点元信息。
     *
     * <p>非挂载点时清空目标，避免残留脏数据。
     */
    @SuppressWarnings("unchecked")
    public void applyMountPointMetadata(Person entity, Map<String, Object> personData) {
        boolean isMountPoint = Boolean.TRUE.equals(personData.get("isMountPoint"));
        entity.setIsMountPoint(isMountPoint);

        Long targetPublicationId = null;
        Long targetRootPersonId = null;
        Object rawTarget = personData.get("mountPointTarget");
        if (rawTarget instanceof Map<?, ?> rawTargetMap) {
            Map<String, Object> targetMap = (Map<String, Object>) rawTargetMap;
            targetPublicationId = toLong(targetMap.get("publicationId"));
            targetRootPersonId = toLong(targetMap.get("rootPersonId"));
            if (targetRootPersonId == null) {
                targetRootPersonId = toLong(targetMap.get("targetRootPersonId"));
            }
            if (targetRootPersonId == null) {
                targetRootPersonId = toLong(targetMap.get("personId"));
            }
        }

        if (targetPublicationId == null) {
            targetPublicationId = toLong(personData.get("targetPublicationId"));
        }
        if (targetRootPersonId == null) {
            targetRootPersonId = toLong(personData.get("targetRootPersonId"));
        }

        if (isMountPoint) {
            entity.setTargetPublicationId(targetPublicationId);
            entity.setTargetRootPersonId(targetRootPersonId);
        } else {
            entity.setTargetPublicationId(null);
            entity.setTargetRootPersonId(null);
        }
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Long.parseLong(text.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
