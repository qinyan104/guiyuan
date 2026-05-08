package com.genealogy.server.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.BadRequestException;
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

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    public PublicationService(PublicationRepository publicationRepository, PersonRepository personRepository,
                              FamilyRepository familyRepository, FamilyMemberRepository familyMemberRepository,
                              PhotoRepository photoRepository, ObjectMapper objectMapper,
                              PublicationAccessRepository publicationAccessRepository,
                              PublicationShareLinkRepository shareLinkRepository,
                              PublicationAuthorizationService authorizationService) {
        this.publicationRepository = publicationRepository;
        this.personRepository = personRepository;
        this.familyRepository = familyRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.photoRepository = photoRepository;
        this.objectMapper = objectMapper;
        this.publicationAccessRepository = publicationAccessRepository;
        this.shareLinkRepository = shareLinkRepository;
        this.authorizationService = authorizationService;
    }

    public List<Map<String, Object>> listPublications(Long userId) {
        return publicationRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream().map(publication -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", publication.getId());
            result.put("title", publication.getTitle());
            result.put("subtitle", publication.getSubtitle());
            result.put("createdAt", publication.getCreatedAt());
            result.put("updatedAt", publication.getUpdatedAt());

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

        List<Person> personEntities = personRepository.findByPublicationId(publicationId);
        Map<String, Long> personDbIdMap = new HashMap<>();
        Map<String, Map<String, Object>> people = new LinkedHashMap<>();
        for (Person person : personEntities) {
            personDbIdMap.put(person.getPersonId(), person.getId());

            Map<String, Object> personJson = new LinkedHashMap<>();
            personJson.put("id", person.getPersonId());
            personJson.put("name", person.getName());
            personJson.put("gender", person.getGender());
            if (person.getBirth() != null) {
                personJson.put("birth", person.getBirth());
            }
            if (person.getDeath() != null) {
                personJson.put("death", person.getDeath());
            }
            if (Boolean.TRUE.equals(person.getDeceased())) {
                personJson.put("deceased", true);
            }
            if (person.getAge() != null) {
                personJson.put("age", person.getAge());
            }
            if (person.getTitleName() != null) {
                personJson.put("titleName", person.getTitleName());
            }
            if (person.getClan() != null) {
                personJson.put("clan", person.getClan());
            }
            if (person.getNote() != null) {
                personJson.put("note", person.getNote());
            }
            if (person.getHighlightRole() != null) {
                personJson.put("highlightRole", person.getHighlightRole());
            }
            if (person.getPhotoId() != null) {
                personJson.put("avatarUrl", "/api/photos/" + person.getPhotoId());
            }
            if (Boolean.TRUE.equals(person.getIsMountPoint())) {
                personJson.put("isMountPoint", true);
                Map<String, Object> mountPointTarget = buildMountPointTarget(person);
                if (!mountPointTarget.isEmpty()) {
                    personJson.put("mountPointTarget", mountPointTarget);
                }
            }
            people.put(person.getPersonId(), personJson);
        }

        Map<Long, String> dbIdToPersonIdMap = new HashMap<>();
        personDbIdMap.forEach((personId, dbId) -> dbIdToPersonIdMap.put(dbId, personId));

        List<Family> familyEntities = familyRepository.findByPublicationId(publicationId);
        Map<String, Map<String, Object>> families = new LinkedHashMap<>();
        for (Family family : familyEntities) {
            List<FamilyMember> members = familyMemberRepository.findByFamilyDbIdOrderBySortOrder(family.getId());
            List<String> adults = new ArrayList<>();
            List<String> children = new ArrayList<>();

            for (FamilyMember member : members) {
                String personId = dbIdToPersonIdMap.get(member.getPersonDbId());
                if (personId == null) {
                    continue;
                }
                if ("adult".equals(member.getRole())) {
                    adults.add(personId);
                } else {
                    children.add(personId);
                }
            }

            Map<String, Object> familyJson = new LinkedHashMap<>();
            familyJson.put("id", family.getFamilyId());
            familyJson.put("adults", adults);
            familyJson.put("children", children);
            if (family.getBranchMode() != null) {
                familyJson.put("branchMode", family.getBranchMode());
            }
            families.put(family.getFamilyId(), familyJson);
        }

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
    public void updatePublication(Long publicationId, String title, String subtitle,
                                  Map<String, Object> publicationData, String settingsJson,
                                  String infoJson) {
        Publication publication = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new NotFoundException("Publication not found"));

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
    }

    @Transactional
    public void deletePublication(Long publicationId) {
        shareLinkRepository.deleteByPublicationId(publicationId);
        List<Family> families = familyRepository.findByPublicationId(publicationId);
        for (Family family : families) {
            familyMemberRepository.deleteByFamilyDbId(family.getId());
        }
        familyRepository.deleteByPublicationId(publicationId);
        personRepository.deleteByPublicationId(publicationId);
        publicationRepository.deleteById(publicationId);
    }

    @Transactional
    public void updatePerson(Long publicationId, String personId, Map<String, Object> data) {
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
            } else if (avatarUrl.startsWith("data:image/")) {
                try {
                    int commaIndex = avatarUrl.indexOf(",");
                    if (commaIndex != -1) {
                        String header = avatarUrl.substring(0, commaIndex);
                        String mimeType = header.substring(header.indexOf(":") + 1, header.indexOf(";"));
                        String base64Data = avatarUrl.substring(commaIndex + 1).replaceAll("\\s", "");
                        byte[] dataBytes = Base64.getMimeDecoder().decode(base64Data);

                        log.info("updatePerson is writing Base64 avatar (personId: {}, mimeType: {}, size: {} bytes)", personId, mimeType, dataBytes.length);

                        Photo photo = new Photo();
                        photo.setMimeType(mimeType);
                        photo.setData(dataBytes);
                        photo.setPersonDbId(person.getId());
                        photo = photoRepository.save(photo);
                        person.setPhotoId(photo.getId());
                    }
                } catch (Exception e) {
                    log.error("updatePerson failed to parse Base64 avatar: {}", e.getMessage(), e);
                }
            } else if (avatarUrl.startsWith("/api/photos/")) {
                try {
                    Long photoId = Long.parseLong(avatarUrl.substring("/api/photos/".length()));
                    person.setPhotoId(photoId);
                } catch (Exception e) {
                    log.warn("updatePerson failed to parse referenced photo (personId: {}, avatarUrl: {}): {}", personId, avatarUrl, e.getMessage());
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
        List<Person> targetPeople = personRepository.findByPublicationId(targetPubId);
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
                Photo clonedPhoto = clonePhotoForPerson(sourcePerson.getPhotoId(), mergedPerson.getId());
                if (clonedPhoto != null) {
                    mergedPerson.setPhotoId(clonedPhoto.getId());
                    mergedPerson = personRepository.save(mergedPerson);
                }
            }

            mergedPersonDbIds.put(sourcePerson.getPersonId(), mergedPerson.getId());
        }

        List<Family> targetFamilies = familyRepository.findByPublicationId(targetPubId);
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
    public void updatePublicationMetadata(Long publicationId, String title, String subtitle, String infoJson) {
        Publication publication = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new NotFoundException("Publication not found"));

        if (title != null) {
            publication.setTitle(title);
        }
        if (subtitle != null) {
            publication.setSubtitle(subtitle);
        }
        publication.setPublicationInfoJson(infoJson);
        publicationRepository.save(publication);
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
                        if (avatarUrl.startsWith("data:image/")) {
                            try {
                                int commaIndex = avatarUrl.indexOf(",");
                                if (commaIndex != -1) {
                                    String header = avatarUrl.substring(0, commaIndex);
                                    String mimeType = header.substring(header.indexOf(":") + 1, header.indexOf(";"));
                                    String base64Data = avatarUrl.substring(commaIndex + 1).replaceAll("\\s", "");
                                    byte[] dataBytes = Base64.getMimeDecoder().decode(base64Data);

                                    log.info("Importing Base64 avatar (personId: {}, mimeType: {}, size: {} bytes)", personId, mimeType, dataBytes.length);

                                    Photo photo = new Photo();
                                    photo.setMimeType(mimeType);
                                    photo.setData(dataBytes);
                                    photo.setPersonDbId(entity.getId());
                                    photo = photoRepository.save(photo);

                                    entity.setPhotoId(photo.getId());
                                    personRepository.save(entity);
                                }
                            } catch (Exception e) {
                                log.error("Failed to parse Base64 avatar (personId: {}): {}", personId, e.getMessage(), e);
                                throw new RuntimeException("Failed to import image (" + personId + "): " + e.getMessage());
                            }
                        } else if (avatarUrl.startsWith("/api/photos/")) {
                            try {
                                Long photoId = Long.parseLong(avatarUrl.substring("/api/photos/".length()));
                                if (cloneReferencedPhotos) {
                                    Photo clonedPhoto = clonePhotoForPerson(photoId, entity.getId());
                                    if (clonedPhoto != null) {
                                        entity.setPhotoId(clonedPhoto.getId());
                                        personRepository.save(entity);
                                    }
                                } else {
                                    entity.setPhotoId(photoId);
                                    personRepository.save(entity);

                                    final Long personDbId = entity.getId();
                                    photoRepository.findById(photoId).ifPresent(photo -> {
                                        photo.setPersonDbId(personDbId);
                                        photoRepository.save(photo);
                                    });
                                }
                            } catch (Exception e) {
                                log.warn("Failed to import referenced photo (personId: {}, avatarUrl: {}): {}", personId, avatarUrl, e.getMessage());
                            }
                        } else if (isLegacyUploadAvatarUrl(avatarUrl)) {
                            Photo importedPhoto = importLegacyUploadPhotoForPerson(avatarUrl, entity.getId());
                            if (importedPhoto != null) {
                                entity.setPhotoId(importedPhoto.getId());
                                personRepository.save(entity);
                            }
                        }
                    }
                }

                if (entity.getPhotoId() == null && photoIdMap.containsKey(personId)) {
                    Long photoId = photoIdMap.get(personId);
                    entity.setPhotoId(photoId);
                    personRepository.save(entity);

                    final Long personDbId = entity.getId();
                    photoRepository.findById(photoId).ifPresent(photo -> {
                        photo.setPersonDbId(personDbId);
                        photoRepository.save(photo);
                    });
                }
            }
        }

        Map<String, Object> families = (Map<String, Object>) data.get("families");
        if (families != null) {
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

    private Photo clonePhotoForPerson(Long sourcePhotoId, Long personDbId) {
        return photoRepository.findById(sourcePhotoId)
                .map(sourcePhoto -> {
                    Photo clonedPhoto = new Photo();
                    clonedPhoto.setPersonDbId(personDbId);
                    clonedPhoto.setMimeType(sourcePhoto.getMimeType());
                    clonedPhoto.setData(Arrays.copyOf(sourcePhoto.getData(), sourcePhoto.getData().length));
                    return photoRepository.save(clonedPhoto);
                })
                .orElseGet(() -> {
                    log.warn("Source photo {} was not found for person {}", sourcePhotoId, personDbId);
                    return null;
                });
    }

    private boolean isLegacyUploadAvatarUrl(String avatarUrl) {
        return extractUploadFileName(avatarUrl) != null;
    }

    private Photo importLegacyUploadPhotoForPerson(String avatarUrl, Long personDbId) {
        String fileName = extractUploadFileName(avatarUrl);
        if (fileName == null || fileName.isBlank()) {
            return null;
        }

        Path uploadRoot = Paths.get("uploads").toAbsolutePath().normalize();
        Path uploadFile = uploadRoot.resolve(fileName).normalize();
        if (!uploadFile.startsWith(uploadRoot)) {
            log.warn("Invalid uploads path detected during import: {}", avatarUrl);
            return null;
        }
        if (!Files.exists(uploadFile)) {
            log.warn("Uploads photo file was not found during import: {}", uploadFile);
            return null;
        }

        try {
            Photo photo = new Photo();
            photo.setPersonDbId(personDbId);
            photo.setMimeType(detectMimeType(fileName));
            photo.setData(Files.readAllBytes(uploadFile));
            return photoRepository.save(photo);
        } catch (IOException e) {
            log.warn("Failed to import uploads photo (avatarUrl: {}): {}", avatarUrl, e.getMessage());
            return null;
        }
    }

    private String extractUploadFileName(String avatarUrl) {
        String path = avatarUrl;
        try {
            path = URI.create(avatarUrl).getPath();
        } catch (Exception ignored) {
        }

        if (path == null || path.isBlank()) {
            return null;
        }

        int uploadIndex = path.indexOf("/uploads/");
        if (uploadIndex < 0) {
            if (path.startsWith("uploads/")) {
                path = "/" + path;
                uploadIndex = 0;
            } else {
                return null;
            }
        }

        String remainder = path.substring(uploadIndex + "/uploads/".length());
        if (remainder.isBlank()) {
            return null;
        }
        return Paths.get(remainder).getFileName().toString();
    }

    private String detectMimeType(String fileName) {
        String lowerName = fileName.toLowerCase();
        if (lowerName.endsWith(".png")) {
            return "image/png";
        }
        if (lowerName.endsWith(".gif")) {
            return "image/gif";
        }
        if (lowerName.endsWith(".webp")) {
            return "image/webp";
        }
        return "image/jpeg";
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
