package com.genealogy.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.model.Family;
import com.genealogy.server.model.FamilyMember;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.Photo;
import com.genealogy.server.repository.FamilyMemberRepository;
import com.genealogy.server.repository.FamilyRepository;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PhotoRepository;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.PublicationRepository;
import com.genealogy.server.repository.PublicationShareLinkRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BranchMergeTest {

    private static final Long MASTER_PUB_ID = 1L;
    private static final Long TARGET_PUB_ID = 2L;
    private static final String MOUNT_POINT_PERSON_ID = "mount-point";

    @Mock
    private PublicationRepository publicationRepository;

    @Mock
    private PersonRepository personRepository;

    @Mock
    private FamilyRepository familyRepository;

    @Mock
    private FamilyMemberRepository familyMemberRepository;

    @Mock
    private PhotoRepository photoRepository;

    @Mock
    private PublicationAccessRepository publicationAccessRepository;

    @Mock
    private PublicationShareLinkRepository shareLinkRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private PublicationAuthorizationService authorizationService;

    @Mock
    private PublicationTreeLoader treeLoader;

    @Mock
    private PhotoService photoService;

    private PublicationService publicationService;

    @BeforeEach
    void setUp() {
        publicationService = new PublicationService(
                publicationRepository,
                personRepository,
                familyRepository,
                familyMemberRepository,
                photoRepository,
                new ObjectMapper(),
                publicationAccessRepository,
                shareLinkRepository,
                auditLogRepository,
                authorizationService,
                treeLoader,
                photoService
        );
    }

    @Test
    void mergeBranchClonesPeopleFamiliesAndPhotosAndClearsMountPoint() {
        UserSubject actor = new UserSubject(99L, "USER", "owner");

        Person mountPoint = new Person();
        mountPoint.setId(10L);
        mountPoint.setPublicationId(MASTER_PUB_ID);
        mountPoint.setPersonId(MOUNT_POINT_PERSON_ID);
        mountPoint.setName("Mount Point");
        mountPoint.setGender("male");
        mountPoint.setIsMountPoint(true);
        mountPoint.setTargetPublicationId(TARGET_PUB_ID);
        mountPoint.setTargetRootPersonId(200L);

        Person branchRoot = new Person();
        branchRoot.setId(20L);
        branchRoot.setPublicationId(TARGET_PUB_ID);
        branchRoot.setPersonId("branch-root");
        branchRoot.setName("Branch Root");
        branchRoot.setGender("male");
        branchRoot.setPhotoId(70L);

        Person branchChild = new Person();
        branchChild.setId(21L);
        branchChild.setPublicationId(TARGET_PUB_ID);
        branchChild.setPersonId("branch-child");
        branchChild.setName("Branch Child");
        branchChild.setGender("female");
        branchChild.setIsMountPoint(true);
        branchChild.setTargetPublicationId(8L);
        branchChild.setTargetRootPersonId(88L);

        Family branchFamily = new Family();
        branchFamily.setId(30L);
        branchFamily.setPublicationId(TARGET_PUB_ID);
        branchFamily.setFamilyId("family-1");
        branchFamily.setBranchMode("uxorilocal");

        FamilyMember adultMember = new FamilyMember();
        adultMember.setFamilyDbId(30L);
        adultMember.setPersonDbId(20L);
        adultMember.setRole("adult");
        adultMember.setSortOrder(0);

        FamilyMember childMember = new FamilyMember();
        childMember.setFamilyDbId(30L);
        childMember.setPersonDbId(21L);
        childMember.setRole("child");
        childMember.setSortOrder(0);

        AtomicLong personIds = new AtomicLong(1000L);
        AtomicLong familyIds = new AtomicLong(2000L);
        Map<String, Person> mergedPeopleBySourceId = new HashMap<>();

        when(personRepository.findByPublicationIdAndPersonId(MASTER_PUB_ID, MOUNT_POINT_PERSON_ID))
                .thenReturn(Optional.of(mountPoint));
        when(personRepository.findByPublicationId(TARGET_PUB_ID))
                .thenReturn(List.of(branchRoot, branchChild));
        when(familyRepository.findByPublicationId(TARGET_PUB_ID))
                .thenReturn(List.of(branchFamily));
        when(familyMemberRepository.findByFamilyDbIdOrderBySortOrder(30L))
                .thenReturn(List.of(adultMember, childMember));
        when(personRepository.findById(200L)).thenReturn(Optional.empty()); // BFS root fallback: person 200 does not exist in target
        when(personRepository.findById(20L)).thenReturn(Optional.of(branchRoot));
        when(personRepository.findById(21L)).thenReturn(Optional.of(branchChild));

        when(photoService.clonePhotoForPerson(anyLong(), anyLong())).thenAnswer(invocation -> {
            Photo cloned = new Photo();
            cloned.setId(3000L);
            cloned.setMimeType("image/png");
            cloned.setData(new byte[]{1, 2, 3, 4});
            cloned.setPersonDbId(invocation.getArgument(1));
            return cloned;
        });

        when(personRepository.save(any(Person.class))).thenAnswer(invocation -> {
            Person person = invocation.getArgument(0);
            if (person.getId() == null) {
                person.setId(personIds.getAndIncrement());
            }
            if (MASTER_PUB_ID.equals(person.getPublicationId())
                    && person.getPersonId() != null
                    && person.getPersonId().startsWith("merged_" + TARGET_PUB_ID + "_")) {
                String sourceId = person.getPersonId().substring(("merged_" + TARGET_PUB_ID + "_").length());
                mergedPeopleBySourceId.put(sourceId, copyOf(person));
            }
            return person;
        });

        when(familyRepository.save(any(Family.class))).thenAnswer(invocation -> {
            Family family = invocation.getArgument(0);
            if (family.getId() == null) {
                family.setId(familyIds.getAndIncrement());
            }
            return family;
        });

        publicationService.mergeBranch(MASTER_PUB_ID, MOUNT_POINT_PERSON_ID, actor);

        verify(authorizationService).require(actor, TARGET_PUB_ID, AccessPermission.READ_FULL);

        Person mergedRoot = mergedPeopleBySourceId.get("branch-root");
        Person mergedChild = mergedPeopleBySourceId.get("branch-child");
        assertThat(mergedRoot).isNotNull();
        assertThat(mergedChild).isNotNull();
        assertThat(mergedRoot.getPublicationId()).isEqualTo(MASTER_PUB_ID);
        assertThat(mergedRoot.getPersonId()).isEqualTo("merged_2_branch-root");
        assertThat(mergedRoot.getPhotoId()).isEqualTo(3000L);
        assertThat(mergedChild.getPersonId()).isEqualTo("merged_2_branch-child");
        assertThat(mergedChild.getIsMountPoint()).isTrue();
        assertThat(mergedChild.getTargetPublicationId()).isEqualTo(8L);
        assertThat(mergedChild.getTargetRootPersonId()).isEqualTo(88L);

        ArgumentCaptor<Family> familyCaptor = ArgumentCaptor.forClass(Family.class);
        verify(familyRepository).save(familyCaptor.capture());
        Family mergedFamily = familyCaptor.getValue();
        assertThat(mergedFamily.getPublicationId()).isEqualTo(MASTER_PUB_ID);
        assertThat(mergedFamily.getFamilyId()).isEqualTo("merged_2_family-1");
        assertThat(mergedFamily.getBranchMode()).isEqualTo("uxorilocal");

        ArgumentCaptor<FamilyMember> familyMemberCaptor = ArgumentCaptor.forClass(FamilyMember.class);
        verify(familyMemberRepository, times(2)).save(familyMemberCaptor.capture());
        List<FamilyMember> mergedMembers = familyMemberCaptor.getAllValues();
        assertThat(mergedMembers).extracting(FamilyMember::getRole).containsExactly("adult", "child");
        assertThat(mergedMembers).extracting(FamilyMember::getPersonDbId)
                .containsExactly(mergedRoot.getId(), mergedChild.getId());

        verify(personRepository, atLeastOnce()).save(mountPoint);
        assertThat(mountPoint.getIsMountPoint()).isFalse();
        assertThat(mountPoint.getTargetPublicationId()).isNull();
        assertThat(mountPoint.getTargetRootPersonId()).isNull();
    }

    @Test
    void mergeBranchRejectsPersonThatIsNotAnActiveMountPoint() {
        UserSubject actor = new UserSubject(99L, "USER", "owner");

        Person invalidMountPoint = new Person();
        invalidMountPoint.setId(10L);
        invalidMountPoint.setPublicationId(MASTER_PUB_ID);
        invalidMountPoint.setPersonId(MOUNT_POINT_PERSON_ID);
        invalidMountPoint.setIsMountPoint(false);
        invalidMountPoint.setTargetPublicationId(TARGET_PUB_ID);

        when(personRepository.findByPublicationIdAndPersonId(MASTER_PUB_ID, MOUNT_POINT_PERSON_ID))
                .thenReturn(Optional.of(invalidMountPoint));

        assertThatThrownBy(() -> publicationService.mergeBranch(MASTER_PUB_ID, MOUNT_POINT_PERSON_ID, actor))
                .isInstanceOf(BadRequestException.class);
    }

    private Person copyOf(Person source) {
        Person copy = new Person();
        copy.setId(source.getId());
        copy.setPublicationId(source.getPublicationId());
        copy.setPersonId(source.getPersonId());
        copy.setName(source.getName());
        copy.setGender(source.getGender());
        copy.setBirth(source.getBirth());
        copy.setDeath(source.getDeath());
        copy.setDeceased(source.getDeceased());
        copy.setAge(source.getAge());
        copy.setTitleName(source.getTitleName());
        copy.setClan(source.getClan());
        copy.setNote(source.getNote());
        copy.setHighlightRole(source.getHighlightRole());
        copy.setPhotoId(source.getPhotoId());
        copy.setIsMountPoint(source.getIsMountPoint());
        copy.setTargetPublicationId(source.getTargetPublicationId());
        copy.setTargetRootPersonId(source.getTargetRootPersonId());
        return copy;
    }
}
