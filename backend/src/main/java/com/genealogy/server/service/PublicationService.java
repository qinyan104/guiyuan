package com.genealogy.server.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.ConflictException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.Family;
import com.genealogy.server.model.FamilyMember;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.Photo;
import com.genealogy.server.model.Publication;
import com.genealogy.server.model.PublicationAccess;
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
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class PublicationService {

    private static final Logger log = LoggerFactory.getLogger(PublicationService.class);

    private final PublicationRepository publicationRepository;
    private final PersonRepository personRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final PhotoRepository photoRepository;
    private final PublicationAccessRepository publicationAccessRepository;
    private final PublicationShareLinkRepository shareLinkRepository;
    private final ObjectMapper objectMapper;
    private final PublicationAuthorizationService authorizationService;
    private final PublicationTreeLoader treeLoader;
    private final PhotoService photoService;

    public PublicationService(PublicationRepository publicationRepository, PersonRepository personRepository,
                              FamilyRepository familyRepository, FamilyMemberRepository familyMemberRepository,
                              PhotoRepository photoRepository, ObjectMapper objectMapper,
                              PublicationAccessRepository publicationAccessRepository,
                              PublicationShareLinkRepository shareLinkRepository,
                              PublicationAuthorizationService authorizationService,
                              PublicationTreeLoader treeLoader,
                              PhotoService photoService) {
        this.publicationRepository = publicationRepository;
        this.personRepository = personRepository;
        this.familyRepository = familyRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.photoRepository = photoRepository;
        this.objectMapper = objectMapper;
        this.publicationAccessRepository = publicationAccessRepository;
        this.shareLinkRepository = shareLinkRepository;
        this.authorizationService = authorizationService;
        this.treeLoader = treeLoader;
        this.photoService = photoService;
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

        List<Publication> publications = publicationRepository.findAllById(accessibleIds);
        publications.sort(Comparator.comparing(Publication::getUpdatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())));

        return publications.stream().map(publication -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", publication.getId());
            result.put("title", publication.getTitle());
            result.put("subtitle", publication.getSubtitle());
            result.put("createdAt", publication.getCreatedAt());
            result.put("updatedAt", publication.getUpdatedAt());
            result.put("accessRole", roleMap.getOrDefault(publication.getId(), "OWNER"));

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

        savePersonsAndFamilies(publication.getId(), publicationData, Map.of(), true);
        return publication.getId();
    }

    @Transactional
    public Long updatePublication(Long publicationId, Long expectedRevision, String title, String subtitle,
                                  Map<String, Object> publicationData, String settingsJson,
                                  String infoJson) {
        Publication publication = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new NotFoundException("Publication not found"));

        long clientRevision = expectedRevision == null ? -1L : expectedRevision;
        long serverRevision = publication.getRevision() == null ? 0L : publication.getRevision();
        if (clientRevision != serverRevision) {
            throw new ConflictException("数据已过期，请刷新页面。");
        }

        long nextRevision = serverRevision + 1;
        publication.setRevision(nextRevision);

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

        Map<String, Long> photoIdMap = new HashMap<>();
        for (Person person : personRepository.findByPublicationId(publicationId)) {
            if (person.getPhotoId() != null) {
                photoIdMap.put(person.getPersonId(), person.getPhotoId());
            }
        }

        List<Family> oldFamilies = familyRepository.findByPublicationId(publicationId);
        for (Family oldFamily : oldFamilies) {
            familyMemberRepository.deleteByFamilyDbId(oldFamily.getId());
        }
        familyRepository.deleteByPublicationId(publicationId);
        personRepository.deleteByPublicationId(publicationId);

        savePersonsAndFamilies(publicationId, publicationData, photoIdMap, false);
        return nextRevision;
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
    public Long updatePerson(Long publicationId, Long expectedRevision, String personId, Map<String, Object> data) {
        Publication publication = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new NotFoundException("Publication not found"));

        long clientRevision = expectedRevision == null ? -1L : expectedRevision;
        long serverRevision = publication.getRevision() == null ? 0L : publication.getRevision();
        if (clientRevision != serverRevision) {
            throw new ConflictException("数据已过期，请刷新页面。");
        }

        Person person = personRepository.findByPublicationIdAndPersonId(publicationId, personId)
                .orElseThrow(() -> new NotFoundException("Person not found"));

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

        long nextRevision = serverRevision + 1;
        publication.setRevision(nextRevision);
        publication.setUpdatedAt(java.time.LocalDateTime.now());
        publicationRepository.save(publication);
        return nextRevision;
    }

    @Transactional
    public void mergeBranch(Long masterPubId, String mountPointPersonId, UserSubject subject) {
        Person mountPoint = personRepository.findByPublicationIdAndPersonId(masterPubId, mountPointPersonId)
                .orElseThrow(() -> new NotFoundException("Person not found"));

        if (!Boolean.TRUE.equals(mountPoint.getIsMountPoint()) || mountPoint.getTargetPublicationId() == null) {
            throw new BadRequestException("Invalid branch mount point");
        }

        Long targetPubId = mountPoint.getTargetPublicationId();
        authorizationService.require(subject, targetPubId, AccessPermission.READ_FULL);

        String idPrefix = "merged_" + targetPubId + "_";

        // Resolve the root person in the target publication (for subtree pruning)
        Person rootPerson = null;
        if (mountPoint.getTargetRootPersonId() != null) {
            rootPerson = personRepository.findById(mountPoint.getTargetRootPersonId()).orElse(null);
        }
        if (rootPerson == null) {
            // Fallback: use the mount point person's own personId to look up in the target publication
            rootPerson = personRepository.findByPublicationIdAndPersonId(
                    targetPubId, mountPointPersonId).orElse(null);
        }

        // Collect the people and families to clone (subtree or full)
        List<Person> targetPeople;
        List<Family> targetFamilies;

        if (rootPerson != null) {
            // BFS traversal to collect the subtree rooted at rootPerson
            Set<Long> collectedPersonDbIds = new HashSet<>();
            Set<Long> collectedFamilyDbIds = new HashSet<>();
            LinkedList<Long> queue = new LinkedList<>();
            queue.add(rootPerson.getId());
            collectedPersonDbIds.add(rootPerson.getId());

            while (!queue.isEmpty()) {
                Long currentPersonDbId = queue.poll();
                List<FamilyMember> memberships = familyMemberRepository.findByPersonDbId(currentPersonDbId);

                for (FamilyMember membership : memberships) {
                    if (!collectedFamilyDbIds.contains(membership.getFamilyDbId())) {
                        collectedFamilyDbIds.add(membership.getFamilyDbId());

                        // Collect all members of this family and enqueue them
                        List<FamilyMember> allFamilyMembers = familyMemberRepository
                                .findByFamilyDbIdOrderBySortOrder(membership.getFamilyDbId());
                        for (FamilyMember fm : allFamilyMembers) {
                            if (collectedPersonDbIds.add(fm.getPersonDbId())) {
                                queue.add(fm.getPersonDbId());
                            }
                        }
                    }
                }
            }

            targetPeople = personRepository.findAllById(collectedPersonDbIds);
            targetFamilies = familyRepository.findAllById(collectedFamilyDbIds);
        } else {
            // Fallback: no root person found, clone everything (original behavior)
            targetPeople = personRepository.findByPublicationId(targetPubId);
            targetFamilies = familyRepository.findByPublicationId(targetPubId);
        }
        Map<String, Long> mergedPersonDbIds = new HashMap<>();

        for (Person sourcePerson : targetPeople) {
            Person mergedPerson = new Person();
            mergedPerson.setPublicationId(masterPubId);
            mergedPerson.setPersonId(idPrefix + sourcePerson.getPersonId());
            mergedPerson.setName(sourcePerson.getName());
            mergedPerson.setGender(sourcePerson.getGender());
            mergedPerson.setBirth(sourcePerson.getBirth());
            mergedPerson.setDeath(sourcePerson.getDeath());
            mergedPerson.setDeceased(sourcePerson.getDeceased());
            mergedPerson.setAge(sourcePerson.getAge());
            mergedPerson.setTitleName(sourcePerson.getTitleName());
            mergedPerson.setClan(sourcePerson.getClan());
            mergedPerson.setNote(sourcePerson.getNote());
            mergedPerson.setHighlightRole(sourcePerson.getHighlightRole());
            mergedPerson.setIsMountPoint(Boolean.TRUE.equals(sourcePerson.getIsMountPoint()));
            mergedPerson.setTargetPublicationId(sourcePerson.getTargetPublicationId());
            mergedPerson.setTargetRootPersonId(sourcePerson.getTargetRootPersonId());

            mergedPerson = personRepository.save(mergedPerson);

            if (sourcePerson.getPhotoId() != null) {
                Photo clonedPhoto = photoService.clonePhotoForPerson(sourcePerson.getPhotoId(), mergedPerson.getId());
                if (clonedPhoto != null) {
                    mergedPerson.setPhotoId(clonedPhoto.getId());
                    mergedPerson = personRepository.save(mergedPerson);
                }
            }

            mergedPersonDbIds.put(sourcePerson.getPersonId(), mergedPerson.getId());
        }

        // Clone collected families
        for (Family sourceFamily : targetFamilies) {
            Family mergedFamily = new Family();
            mergedFamily.setPublicationId(masterPubId);
            mergedFamily.setFamilyId(idPrefix + sourceFamily.getFamilyId());
            mergedFamily.setBranchMode(sourceFamily.getBranchMode());
            mergedFamily = familyRepository.save(mergedFamily);

            List<FamilyMember> members = familyMemberRepository.findByFamilyDbIdOrderBySortOrder(sourceFamily.getId());
            for (FamilyMember sourceMember : members) {
                Person sourceMemberPerson = personRepository.findById(sourceMember.getPersonDbId()).orElse(null);
                if (sourceMemberPerson == null) {
                    continue;
                }

                Long mergedPersonDbId = mergedPersonDbIds.get(sourceMemberPerson.getPersonId());
                if (mergedPersonDbId == null) {
                    continue;
                }

                FamilyMember mergedMember = new FamilyMember();
                mergedMember.setFamilyDbId(mergedFamily.getId());
                mergedMember.setPersonDbId(mergedPersonDbId);
                mergedMember.setRole(sourceMember.getRole());
                mergedMember.setSortOrder(sourceMember.getSortOrder());
                familyMemberRepository.save(mergedMember);
            }
        }

        mountPoint.setIsMountPoint(false);
        mountPoint.setTargetPublicationId(null);
        mountPoint.setTargetRootPersonId(null);
        personRepository.save(mountPoint);
    }

    @Transactional
    public Long updatePublicationMetadata(Long publicationId, Long expectedRevision, String title, String subtitle, String infoJson) {
        Publication publication = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new NotFoundException("Publication not found"));

        long clientRevision = expectedRevision == null ? -1L : expectedRevision;
        long serverRevision = publication.getRevision() == null ? 0L : publication.getRevision();
        if (clientRevision != serverRevision) {
            throw new ConflictException("数据已过期，请刷新页面。");
        }

        long nextRevision = serverRevision + 1;
        publication.setRevision(nextRevision);

        if (title != null) {
            publication.setTitle(title);
        }
        if (subtitle != null) {
            publication.setSubtitle(subtitle);
        }
        publication.setPublicationInfoJson(infoJson);
        publicationRepository.save(publication);
        return nextRevision;
    }

    @SuppressWarnings("unchecked")
    private void savePersonsAndFamilies(Long publicationId, Map<String, Object> data, Map<String, Long> photoIdMap,
                                        boolean cloneReferencedPhotos) {
        Map<String, Long> personIdToDbId = new HashMap<>();
        Map<String, Object> people = (Map<String, Object>) data.get("people");
        if (people != null) {
            for (Map.Entry<String, Object> entry : people.entrySet()) {
                String personId = entry.getKey();
                Map<String, Object> personData = (Map<String, Object>) entry.getValue();

                Person entity = new Person();
                entity.setPublicationId(publicationId);
                entity.setPersonId(personId);
                entity.setName((String) personData.getOrDefault("name", "Unknown"));
                entity.setGender((String) personData.getOrDefault("gender", "unknown"));
                entity.setBirth((String) personData.get("birth"));
                entity.setDeath((String) personData.get("death"));
                entity.setDeceased(personData.containsKey("deceased") ? (Boolean) personData.get("deceased") : false);
                entity.setAge((String) personData.get("age"));
                entity.setTitleName((String) personData.get("titleName"));
                entity.setClan((String) personData.get("clan"));
                entity.setNote((String) personData.get("note"));
                entity.setHighlightRole((String) personData.get("highlightRole"));
                applyMountPointMetadata(entity, personData);

                entity = personRepository.save(entity);
                personIdToDbId.put(personId, entity.getId());

                if (personData.containsKey("avatarUrl")) {
                    String avatarUrl = (String) personData.get("avatarUrl");
                    if (avatarUrl != null) {
                        Long photoId = photoService.handlePersonAvatar(entity.getId(), avatarUrl, cloneReferencedPhotos);
                        if (photoId != null) {
                            entity.setPhotoId(photoId);
                            personRepository.save(entity);
                        }
                    }
                }

                if (entity.getPhotoId() == null && photoIdMap.containsKey(personId)) {
                    Long photoId = photoIdMap.get(personId);
                    entity.setPhotoId(photoId);
                    personRepository.save(entity);

                    photoService.reassignPhoto(entity.getId(), photoId);
                }
            }
        }

        Map<String, Object> families = (Map<String, Object>) data.get("families");
        if (families != null) {
            // Cross-family duplicate validation
            Map<String, List<String>> adultToFamilies = new HashMap<>();
            Map<String, List<String>> childToFamilies = new HashMap<>();

            for (Map.Entry<String, Object> entry : families.entrySet()) {
                Map<String, Object> familyData = (Map<String, Object>) entry.getValue();
                List<String> adults = (List<String>) familyData.get("adults");
                if (adults != null) {
                    for (String adultId : adults) {
                        adultToFamilies.computeIfAbsent(adultId, k -> new ArrayList<>()).add(entry.getKey());
                    }
                }
                List<String> children = (List<String>) familyData.get("children");
                if (children != null) {
                    for (String childId : children) {
                        childToFamilies.computeIfAbsent(childId, k -> new ArrayList<>()).add(entry.getKey());
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

            for (Map.Entry<String, Object> entry : families.entrySet()) {
                String familyId = entry.getKey();
                Map<String, Object> familyData = (Map<String, Object>) entry.getValue();

                Family familyEntity = new Family();
                familyEntity.setPublicationId(publicationId);
                familyEntity.setFamilyId(familyId);
                familyEntity.setBranchMode((String) familyData.get("branchMode"));
                familyEntity = familyRepository.save(familyEntity);

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
                        familyMemberRepository.save(member);
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
                        familyMemberRepository.save(member);
                    }
                }
            }
        }
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
}
