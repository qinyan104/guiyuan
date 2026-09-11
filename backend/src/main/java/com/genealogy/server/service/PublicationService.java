package com.genealogy.server.service;

import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.ConflictException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.Family;
import com.genealogy.server.model.Person;
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

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PublicationService {

    private static final Logger log = LoggerFactory.getLogger(PublicationService.class);
    private static final String FEDERATED_ID_PREFIX = "branch_";

    private final PublicationRepository publicationRepository;
    private final PersonRepository personRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final PhotoRepository photoRepository;
    private final PublicationAccessRepository publicationAccessRepository;
    private final PublicationShareLinkRepository shareLinkRepository;
    private final PhotoService photoService;
    private final PersonDiffService personDiffService;
    private final BranchMergeService branchMergeService;
    private final PublicationQueryService queryService;
    private final PublicationPersonWriter personWriter;

    public record SaveResult(Long newRevision, String personDiff) {}

    public PublicationService(PublicationRepository publicationRepository, PersonRepository personRepository,
                              FamilyRepository familyRepository, FamilyMemberRepository familyMemberRepository,
                              PhotoRepository photoRepository,
                              PublicationAccessRepository publicationAccessRepository,
                              PublicationShareLinkRepository shareLinkRepository,
                              PhotoService photoService,
                              PersonDiffService personDiffService,
                              BranchMergeService branchMergeService,
                              PublicationQueryService queryService,
                              PublicationPersonWriter personWriter) {
        this.publicationRepository = publicationRepository;
        this.personRepository = personRepository;
        this.familyRepository = familyRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.photoRepository = photoRepository;
        this.publicationAccessRepository = publicationAccessRepository;
        this.shareLinkRepository = shareLinkRepository;
        this.photoService = photoService;
        this.personDiffService = personDiffService;
        this.branchMergeService = branchMergeService;
        this.queryService = queryService;
        this.personWriter = personWriter;
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
    /**
     * @see PublicationQueryService#listPublications(Long)
     */
    public List<Map<String, Object>> listPublications(Long userId) {
        return queryService.listPublications(userId);
    }

    /**
     * @see PublicationQueryService#loadPublication(Long)
     */
    public Map<String, Object> loadPublication(Long publicationId) {
        return queryService.loadPublication(publicationId);
    }

    /**
     * @see PublicationQueryService#getPublicationRevision(Long)
     */
    public long getPublicationRevision(Long publicationId) {
        return queryService.getPublicationRevision(publicationId);
    }


    @Transactional
    public Long createPublication(Long userId, String title, String subtitle,
                                  Map<String, Object> publicationData, String settingsJson,
                                  String infoJson) {
        Map<String, Object> localPublicationData = localPublicationData(publicationData);
        Publication publication = new Publication();
        publication.setUserId(userId);
        publication.setTitle(title != null ? title : "Untitled publication");
        publication.setSubtitle(subtitle != null ? subtitle : "");
        publication.setSettingsJson(settingsJson);
        publication.setPublicationInfoJson(infoJson);
        String focusFamilyId = (String) localPublicationData.get("focusFamilyId");
        publication.setFocusFamilyId(isFederatedId(focusFamilyId) ? null : focusFamilyId);
        publication = publicationRepository.save(publication);

        PublicationAccess ownerAccess = new PublicationAccess();
        ownerAccess.setPublicationId(publication.getId());
        ownerAccess.setUserId(userId);
        ownerAccess.setRole("OWNER");
        ownerAccess.setCreatedBy(userId);
        publicationAccessRepository.save(ownerAccess);

        personWriter.savePersonsAndFamilies(publication.getId(), localPublicationData,
                List.of(), List.of(), true);
        return publication.getId();
    }

    @Transactional
    public SaveResult updatePublication(Long publicationId, Long expectedRevision, String title, String subtitle,
                                  Map<String, Object> publicationData, String settingsJson,
                                  String infoJson) {
        Map<String, Object> localPublicationData = localPublicationData(publicationData);
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
        String focusFamilyId = (String) localPublicationData.get("focusFamilyId");
        if (!isFederatedId(focusFamilyId)) {
            publication.setFocusFamilyId(focusFamilyId);
        }
        publicationRepository.save(publication);

        List<Person> existingPersons = personRepository.findByPublicationId(publicationId);
        Map<String, Person> dbPersonCache = new HashMap<>();
        for (Person person : existingPersons) {
            dbPersonCache.put(person.getPersonId(), person);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> people = (Map<String, Object>) localPublicationData.get("people");
        String diff = personDiffService.computePersonDiff(people, dbPersonCache);

        personWriter.savePersonsAndFamilies(
                publicationId,
                localPublicationData,
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

        if (isFederatedId(personId)) {
            throw new BadRequestException("挂载分支人物为只读，请进入来源族谱编辑。");
        }

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
        personWriter.applyMountPointMetadata(person, data);

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
        Publication publication = publicationRepository.findById(masterPubId)
                .orElseThrow(() -> new NotFoundException("Publication not found"));
        publication.setRevision((publication.getRevision() == null ? 0L : publication.getRevision()) + 1);
        publicationRepository.save(publication);
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
    private Map<String, Object> localPublicationData(Map<String, Object> data) {
        Map<String, Object> localData = new LinkedHashMap<>(data);
        localData.put("people", filterFederatedEntries((Map<String, Object>) data.get("people")));
        localData.put("families", filterFederatedEntries((Map<String, Object>) data.get("families")));
        return localData;
    }

    private Map<String, Object> filterFederatedEntries(Map<String, Object> entries) {
        if (entries == null) {
            return null;
        }
        Map<String, Object> localEntries = new LinkedHashMap<>();
        entries.forEach((id, value) -> {
            if (!isFederatedId(id)) {
                localEntries.put(id, value);
            }
        });
        return localEntries;
    }

    private boolean isFederatedId(String id) {
        return id != null && id.startsWith(FEDERATED_ID_PREFIX);
    }

    public BranchMergeService.SubtreeResult collectSubtreeIds(Long rootPersonDbId) {
        return branchMergeService.collectSubtreeIds(rootPersonDbId);
    }
}
