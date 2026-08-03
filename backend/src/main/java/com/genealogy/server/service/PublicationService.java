package com.genealogy.server.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.ConflictException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.AuditLog;
import com.genealogy.server.model.Family;
import com.genealogy.server.model.FamilyMember;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.Publication;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.repository.FamilyMemberRepository;
import com.genealogy.server.repository.FamilyRepository;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PhotoRepository;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.PublicationRepository;
import com.genealogy.server.repository.PublicationShareLinkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class PublicationService {

    private static final Logger log = LoggerFactory.getLogger(PublicationService.class);
    private static final List<String> PUBLICATION_MUTATION_ACTIONS = List.of(
            "CREATE_PUB",
            "UPDATE_PUB",
            "UPDATE_PUB_META",
            "UPDATE_PERSON",
            "DELETE_PUB"
    );

    private final PublicationRepository publicationRepository;
    private final PersonRepository personRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final PhotoRepository photoRepository;
    private final PublicationAccessRepository publicationAccessRepository;
    private final PublicationShareLinkRepository shareLinkRepository;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;
    private final PublicationAuthorizationService authorizationService;
    private final PublicationTreeLoader treeLoader;
    private final PhotoService photoService;
    private final PersonDiffService personDiffService;
    private final BranchMergeService branchMergeService;

    public record SaveResult(Long newRevision, String personDiff) {}

    public PublicationService(PublicationRepository publicationRepository, PersonRepository personRepository,
                              FamilyRepository familyRepository, FamilyMemberRepository familyMemberRepository,
                              PhotoRepository photoRepository, ObjectMapper objectMapper,
                              PublicationAccessRepository publicationAccessRepository,
                              PublicationShareLinkRepository shareLinkRepository,
                              AuditLogRepository auditLogRepository,
                              PublicationAuthorizationService authorizationService,
                              PublicationTreeLoader treeLoader,
                              PhotoService photoService,
                              PersonDiffService personDiffService,
                              BranchMergeService branchMergeService) {
        this.publicationRepository = publicationRepository;
        this.personRepository = personRepository;
        this.familyRepository = familyRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.photoRepository = photoRepository;
        this.objectMapper = objectMapper;
        this.publicationAccessRepository = publicationAccessRepository;
        this.shareLinkRepository = shareLinkRepository;
        this.auditLogRepository = auditLogRepository;
        this.authorizationService = authorizationService;
        this.treeLoader = treeLoader;
        this.photoService = photoService;
        this.personDiffService = personDiffService;
        this.branchMergeService = branchMergeService;
    }

    /** @deprecated use {@link SaveResult#personDiff()} from updatePublication/updatePerson instead */
    @Deprecated
    public String getLastPersonDiff() { return personDiffService.getLastPersonDiff(); }

    private void verifyRevision(Publication publication, Long expectedRevision) {
        long clientRevision = expectedRevision == null ? -1L : expectedRevision;
        long serverRevision = publication.getRevision() == null ? 0L : publication.getRevision();
        if (clientRevision != serverRevision) {
            throw new ConflictException("数据已过期，请刷新页面。");
        }
    }

    public List<Map<String, Object>> listPublications(Long userId) {
        List<PublicationAccess> accessRecords = publicationAccessRepository.findByUserId(userId);
        Set<Long> accessibleIds = accessRecords.stream()
                .map(PublicationAccess::getPublicationId)
                .collect(java.util.stream.Collectors.toSet());

        List<Publication> owned = publicationRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        for (Publication pub : owned) {
            accessibleIds.add(pub.getId());
        }

        if (accessibleIds.isEmpty()) {
            return List.of();
        }

        Map<Long, String> roleMap = new HashMap<>();
        for (PublicationAccess access : accessRecords) {
            roleMap.put(access.getPublicationId(), access.getRole());
        }
        for (Publication pub : owned) {
            roleMap.putIfAbsent(pub.getId(), "OWNER");
        }

        List<Publication> publications = new ArrayList<>(publicationRepository.findAllById(accessibleIds));
        publications.sort(Comparator.comparing(Publication::getUpdatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())));

        // Batch-fetch latest audit logs instead of N individual queries
        Map<Long, AuditLog> latestAuditByPubId = new HashMap<>();
        if (!accessibleIds.isEmpty()) {
            List<AuditLog> auditLogs = auditLogRepository
                    .findLatestByTargetIds("publication", accessibleIds, PUBLICATION_MUTATION_ACTIONS);
            for (AuditLog logEntry : auditLogs) {
                latestAuditByPubId.merge(logEntry.getTargetId(), logEntry,
                        (a, b) -> a.getCreatedAt().isAfter(b.getCreatedAt()) ? a : b);
            }
        }

        return publications.stream().map(publication -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", publication.getId());
            result.put("revision", publication.getRevision());
            result.put("title", publication.getTitle());
            result.put("subtitle", publication.getSubtitle());
            result.put("createdAt", publication.getCreatedAt());
            result.put("updatedAt", publication.getUpdatedAt());
            result.put("accessRole", roleMap.getOrDefault(publication.getId(), "OWNER"));

            AuditLog auditLog = latestAuditByPubId.get(publication.getId());
            if (auditLog != null) {
                result.put("lastUpdatedBy", auditLog.getUsername());
                result.put("lastActivityAction", auditLog.getAction());
            }

            if (publication.getPublicationInfoJson() != null) {
                try {
                    Map<String, Object> info = objectMapper.readValue(
                            publication.getPublicationInfoJson(),
                            new TypeReference<>() {}
                    );
                    result.put("info", info);
                    Object description = info.get("description");
                    if (description instanceof String text && !text.isBlank()) {
                        result.put("description", text.length() > 80 ? text.substring(0, 80) + "..." : text);
                    }
                } catch (JsonProcessingException e) {
                    log.warn("Publication {} info JSON parse failed: {}", publication.getId(), e.getMessage());
                }
            }

            return result;
        }).toList();
    }

    public Map<String, Object> loadPublication(Long publicationId) {
        Publication publication = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new NotFoundException("Publication not found"));

        Map<String, Map<String, Object>> people = new LinkedHashMap<>();
        Map<String, Map<String, Object>> families = new LinkedHashMap<>();
        
        // Load federated data (root + linked branches up to depth 3)
        treeLoader.loadFederatedData(publicationId, 3, "", people, families);

        Map<String, Object> publicationJson = new LinkedHashMap<>();
        publicationJson.put("title", publication.getTitle());
        publicationJson.put("subtitle", publication.getSubtitle() != null ? publication.getSubtitle() : "");
        publicationJson.put("focusFamilyId", publication.getFocusFamilyId() != null ? publication.getFocusFamilyId() : "");
        publicationJson.put("people", people);
        publicationJson.put("families", families);

        if (publication.getPublicationInfoJson() != null) {
            try {
                publicationJson.put("info", objectMapper.readValue(publication.getPublicationInfoJson(), new TypeReference<>() {}));
            } catch (JsonProcessingException e) {
                log.warn("Publication {} info JSON parse failed: {}", publication.getId(), e.getMessage());
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", publication.getId());
        response.put("revision", publication.getRevision());
        response.put("publication", publicationJson);
        if (publication.getSettingsJson() != null) {
            try {
                response.put("settings", objectMapper.readValue(publication.getSettingsJson(), new TypeReference<>() {}));
            } catch (JsonProcessingException e) {
                response.put("settings", Map.of());
            }
        } else {
            response.put("settings", Map.of());
        }

        return response;
    }

    @Transactional
    public Long createPublication(Long userId, String title, String subtitle,
                                  Map<String, Object> publicationData, String settingsJson,
                                  String infoJson) {
        Publication publication = new Publication();
        publication.setUserId(userId);
        publication.setTitle(title != null ? title : "Untitled publication");
        publication.setSubtitle(subtitle != null ? subtitle : "");
        publication.setSettingsJson(settingsJson);
        publication.setPublicationInfoJson(infoJson);
        publication.setFocusFamilyId((String) publicationData.get("focusFamilyId"));
        publication = publicationRepository.save(publication);

        PublicationAccess ownerAccess = new PublicationAccess();
        ownerAccess.setPublicationId(publication.getId());
        ownerAccess.setUserId(userId);
        ownerAccess.setRole("OWNER");
        ownerAccess.setCreatedBy(userId);
        publicationAccessRepository.save(ownerAccess);

        savePersonsAndFamilies(publication.getId(), publicationData, List.of(), List.of(), true);
        return publication.getId();
    }

    @Transactional
    public SaveResult updatePublication(Long publicationId, Long expectedRevision, String title, String subtitle,
                                  Map<String, Object> publicationData, String settingsJson,
                                  String infoJson) {
        Publication publication = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new NotFoundException("Publication not found"));

        verifyRevision(publication, expectedRevision);

        if (title != null) {
            publication.setTitle(title);
        }
        if (subtitle != null) {
            publication.setSubtitle(subtitle);
        }
        publication.setSettingsJson(settingsJson);
        publication.setPublicationInfoJson(infoJson);
        publication.setFocusFamilyId((String) publicationData.get("focusFamilyId"));
        publicationRepository.save(publication);

        List<Person> existingPersons = personRepository.findByPublicationId(publicationId);
        Map<String, Person> dbPersonCache = new HashMap<>();
        for (Person person : existingPersons) {
            dbPersonCache.put(person.getPersonId(), person);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> people = (Map<String, Object>) publicationData.get("people");
        String diff = personDiffService.computePersonDiff(people, dbPersonCache);

        savePersonsAndFamilies(
                publicationId,
                publicationData,
                existingPersons,
                familyRepository.findByPublicationId(publicationId),
                false
        );
        publicationRepository.flush();

        return new SaveResult(publication.getRevision(), diff);
    }

    @Transactional
    public void deletePublication(Long publicationId) {
        shareLinkRepository.deleteByPublicationId(publicationId);
        publicationAccessRepository.deleteByPublicationId(publicationId);
        List<Family> families = familyRepository.findByPublicationId(publicationId);
        for (Family family : families) {
            familyMemberRepository.deleteByFamilyDbId(family.getId());
        }
        familyRepository.deleteByPublicationId(publicationId);
        personRepository.deleteByPublicationId(publicationId);
        publicationRepository.deleteById(publicationId);
    }

    @Transactional
    public SaveResult updatePerson(Long publicationId, Long expectedRevision, String personId, Map<String, Object> data) {
        Publication publication = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new NotFoundException("Publication not found"));

        verifyRevision(publication, expectedRevision);

        Person person = personRepository.findByPublicationIdAndPersonId(publicationId, personId)
                .orElseThrow(() -> new NotFoundException("Person not found"));

        String diff = personDiffService.computeSinglePersonDiff(person, data, personId);

        if (data.containsKey("name")) {
            person.setName((String) data.get("name"));
        }
        if (data.containsKey("gender")) {
            person.setGender((String) data.get("gender"));
        }
        if (data.containsKey("birth")) {
            person.setBirth((String) data.get("birth"));
        }
        if (data.containsKey("death")) {
            person.setDeath((String) data.get("death"));
        }
        if (data.containsKey("deceased")) {
            person.setDeceased((Boolean) data.get("deceased"));
        }
        // 如果 death 有值，自动推断为已故（避免前端未传 deceased 导致数据不一致）
        if (person.getDeath() != null && !person.getDeath().isBlank()) {
            person.setDeceased(true);
        }
        if (data.containsKey("age")) {
            person.setAge((String) data.get("age"));
        }
        if (data.containsKey("titleName")) {
            person.setTitleName((String) data.get("titleName"));
        }
        if (data.containsKey("clan")) {
            person.setClan((String) data.get("clan"));
        }
        if (data.containsKey("note")) {
            person.setNote((String) data.get("note"));
        }
        if (data.containsKey("highlightRole")) {
            person.setHighlightRole((String) data.get("highlightRole"));
        }
        applyMountPointMetadata(person, data);

        if (data.containsKey("avatarUrl")) {
            String avatarUrl = (String) data.get("avatarUrl");
            if (avatarUrl == null || avatarUrl.isEmpty()) {
                person.setPhotoId(null);
            } else {
                Long photoId = photoService.handlePersonAvatar(person.getId(), avatarUrl, false);
                if (photoId != null) {
                    person.setPhotoId(photoId);
                }
            }
        }

        personRepository.save(person);

        if (person.getPhotoId() != null) {
            final Long personDbId = person.getId();
            photoRepository.findById(person.getPhotoId()).ifPresent(photo -> {
                if (!personDbId.equals(photo.getPersonDbId())) {
                    photo.setPersonDbId(personDbId);
                    photoRepository.save(photo);
                }
            });
        }

        publicationRepository.save(publication);
        return new SaveResult(publication.getRevision(), diff);
    }

    @Transactional
    public void mergeBranch(Long masterPubId, String mountPointPersonId, UserSubject subject) {
        branchMergeService.mergeBranch(masterPubId, mountPointPersonId, subject);
    }

    @Transactional
    public Long updatePublicationMetadata(Long publicationId, Long expectedRevision, String title, String subtitle, String infoJson) {
        Publication publication = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new NotFoundException("Publication not found"));

        verifyRevision(publication, expectedRevision);

        if (title != null) {
            publication.setTitle(title);
        }
        if (subtitle != null) {
            publication.setSubtitle(subtitle);
        }
        publication.setPublicationInfoJson(infoJson);
        publicationRepository.save(publication);
        return publication.getRevision();
    }

    @SuppressWarnings("unchecked")
    private void savePersonsAndFamilies(Long publicationId, Map<String, Object> data,
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
                boolean deceasedFromData = personData.containsKey("deceased") && Boolean.TRUE.equals(personData.get("deceased"));
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
                        Long photoId = photoService.handlePersonAvatar(entity.getId(), avatarUrl, cloneReferencedPhotos);
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
                List<String> adults = (List<String>) familyData.get("adults");
                if (adults != null) {
                    for (int i = 0; i < adults.size(); i++) {
                        Long personDbId = personIdToDbId.get(adults.get(i));
                        if (personDbId == null) {
                            continue;
                        }

                        FamilyMember member = new FamilyMember();
                        member.setFamilyDbId(familyEntity.getId());
                        member.setPersonDbId(personDbId);
                        member.setRole("adult");
                        member.setSortOrder(i);
                        desiredMembers.add(member);
                    }
                }

                List<String> children = (List<String>) familyData.get("children");
                if (children != null) {
                    for (int i = 0; i < children.size(); i++) {
                        Long personDbId = personIdToDbId.get(children.get(i));
                        if (personDbId == null) {
                            continue;
                        }

                        FamilyMember member = new FamilyMember();
                        member.setFamilyDbId(familyEntity.getId());
                        member.setPersonDbId(personDbId);
                        member.setRole("child");
                        member.setSortOrder(i);
                        desiredMembers.add(member);
                    }
                }

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

    private boolean sameFamilyMembers(List<FamilyMember> current, List<FamilyMember> desired) {
        if (current.size() != desired.size()) {
            return false;
        }
        List<String> currentKeys = current.stream().map(this::familyMemberKey).sorted().toList();
        List<String> desiredKeys = desired.stream().map(this::familyMemberKey).sorted().toList();
        return currentKeys.equals(desiredKeys);
    }

    private String familyMemberKey(FamilyMember member) {
        return member.getPersonDbId() + ":" + member.getRole() + ":" + member.getSortOrder();
    }

    @SuppressWarnings("unchecked")
    private void validatePublicationData(Map<String, Object> data) {
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

    @SuppressWarnings("unchecked")
    private void applyMountPointMetadata(Person entity, Map<String, Object> personData) {
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

    private Map<String, Object> buildMountPointTarget(Person person) {
        Map<String, Object> mountPointTarget = new LinkedHashMap<>();
        if (person.getTargetPublicationId() == null) {
            return mountPointTarget;
        }

        mountPointTarget.put("publicationId", person.getTargetPublicationId());
        publicationRepository.findById(person.getTargetPublicationId())
                .ifPresent(targetPublication -> mountPointTarget.put("publicationTitle", targetPublication.getTitle()));
        if (person.getTargetRootPersonId() != null) {
            mountPointTarget.put("rootPersonId", person.getTargetRootPersonId());
        }
        return mountPointTarget;
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
                return Long.parseLong(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    public BranchMergeService.SubtreeResult collectSubtreeIds(Long rootPersonDbId) {
        return branchMergeService.collectSubtreeIds(rootPersonDbId);
    }
}
