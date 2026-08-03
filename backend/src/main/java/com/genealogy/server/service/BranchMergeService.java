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

        if (mountPoint.getTargetRootPersonId() == null) {
            throw new BadRequestException("请先选择目标族谱中的合并人物");
        }
        Person rootPerson = personRepository.findById(mountPoint.getTargetRootPersonId())
                .filter(person -> targetPubId.equals(person.getPublicationId()))
                .orElseThrow(() -> new BadRequestException("目标合并人物不存在"));
        if (!sameName(mountPoint, rootPerson)) {
            throw new BadRequestException("两位合并人物的姓名必须一致");
        }
        if (Boolean.TRUE.equals(rootPerson.getIsMountPoint())) {
            throw new BadRequestException("目标合并人物本身仍是挂载点，请先处理其挂载关系");
        }
        if (hasAdultFamily(mountPoint.getId()) && hasAdultFamily(rootPerson.getId())) {
            throw new BadRequestException("两位合并人物都已有下游家庭，暂不支持自动合并");
        }

        SubtreeResult result = collectSubtreeIds(rootPerson.getId());
        List<Person> targetPeople = personRepository.findAllById(result.personDbIds());
        if (targetPeople.stream().anyMatch(person -> Boolean.TRUE.equals(person.getIsMountPoint()))) {
            throw new BadRequestException("合并范围内包含嵌套挂载点，请先处理其挂载关系");
        }
        List<Family> targetFamilies = familyRepository.findAllById(result.familyDbIds());
        Map<String, Long> mergedPersonDbIds = new HashMap<>();
        mergedPersonDbIds.put(rootPerson.getPersonId(), mountPoint.getId());

        for (Person sourcePerson : targetPeople) {
            if (sourcePerson.getId().equals(rootPerson.getId())) {
                continue;
            }
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

    private boolean sameName(Person left, Person right) {
        return left.getName() != null && right.getName() != null
                && left.getName().trim().equals(right.getName().trim());
    }

    private boolean hasAdultFamily(Long personDbId) {
        return familyMemberRepository.findByPersonDbId(personDbId).stream()
                .anyMatch(member -> "adult".equals(member.getRole()));
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
                if (!"adult".equals(membership.getRole())) {
                    continue;
                }
                if (collectedFamilyDbIds.add(membership.getFamilyDbId())) {
                    List<FamilyMember> allFamilyMembers = familyMemberRepository
                            .findByFamilyDbIdOrderBySortOrder(membership.getFamilyDbId());
                    for (FamilyMember fm : allFamilyMembers) {
                        boolean added = collectedPersonDbIds.add(fm.getPersonDbId());
                        if (added && "child".equals(fm.getRole())) {
                            queue.add(fm.getPersonDbId());
                        }
                    }
                }
            }
        }
        return new SubtreeResult(collectedPersonDbIds, collectedFamilyDbIds);
    }
}
