package com.genealogy.server.service;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.Family;
import com.genealogy.server.model.FamilyMember;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.Photo;
import com.genealogy.server.repository.FamilyMemberRepository;
import com.genealogy.server.repository.FamilyRepository;
import com.genealogy.server.repository.PersonRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class BranchMergeService {

    private static final Logger log = LoggerFactory.getLogger(BranchMergeService.class);

    private final PersonRepository personRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final PhotoService photoService;
    private final PublicationAuthorizationService authorizationService;

    public BranchMergeService(PersonRepository personRepository,
                              FamilyRepository familyRepository,
                              FamilyMemberRepository familyMemberRepository,
                              PhotoService photoService,
                              PublicationAuthorizationService authorizationService) {
        this.personRepository = personRepository;
        this.familyRepository = familyRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.photoService = photoService;
        this.authorizationService = authorizationService;
    }

    public record SubtreeResult(Set<Long> personDbIds, Set<Long> familyDbIds) {}

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
            SubtreeResult result = collectSubtreeIds(rootPerson.getId());
            targetPeople = personRepository.findAllById(result.personDbIds());
            targetFamilies = familyRepository.findAllById(result.familyDbIds());
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

    public SubtreeResult collectSubtreeIds(Long rootPersonDbId) {
        Set<Long> collectedPersonDbIds = new HashSet<>();
        Set<Long> collectedFamilyDbIds = new HashSet<>();
        LinkedList<Long> queue = new LinkedList<>();

        queue.add(rootPersonDbId);
        collectedPersonDbIds.add(rootPersonDbId);

        while (!queue.isEmpty()) {
            Long currentPersonDbId = queue.poll();
            List<FamilyMember> memberships = familyMemberRepository.findByPersonDbId(currentPersonDbId);

            for (FamilyMember membership : memberships) {
                if (collectedFamilyDbIds.add(membership.getFamilyDbId())) {
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
        return new SubtreeResult(collectedPersonDbIds, collectedFamilyDbIds);
    }
}
