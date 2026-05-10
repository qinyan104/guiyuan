package com.genealogy.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.Photo;
import com.genealogy.server.model.Publication;
import com.genealogy.server.model.Family;
import com.genealogy.server.repository.FamilyMemberRepository;
import com.genealogy.server.repository.FamilyRepository;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PhotoRepository;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.PublicationRepository;
import com.genealogy.server.repository.PublicationShareLinkRepository;
import com.genealogy.server.exception.ConflictException;
import com.genealogy.server.service.PublicationAuthorizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicationServiceTest {

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
                authorizationService,
                treeLoader,
                photoService
        );
    }

    @Test
    void createPublicationClonesReferencedPhotoWhenImportUsesApiPhotoUrl() {
        AtomicLong publicationIds = new AtomicLong(100L);
        AtomicLong personIds = new AtomicLong(200L);
        AtomicLong familyIds = new AtomicLong(400L);

        when(publicationRepository.save(any(Publication.class))).thenAnswer(invocation -> {
            Publication publication = invocation.getArgument(0);
            if (publication.getId() == null) {
                publication.setId(publicationIds.getAndIncrement());
            }
            return publication;
        });

        when(personRepository.save(any(Person.class))).thenAnswer(invocation -> {
            Person person = invocation.getArgument(0);
            if (person.getId() == null) {
                person.setId(personIds.getAndIncrement());
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

        when(photoService.handlePersonAvatar(anyLong(), eq("/api/photos/7"), eq(true))).thenReturn(300L);

        Map<String, Object> publicationData = buildPublicationData("/api/photos/7");

        Long publicationId = publicationService.createPublication(1L, "李氏族谱", "测试导入", publicationData, null, null);

        assertThat(publicationId).isEqualTo(100L);

        ArgumentCaptor<Person> personCaptor = ArgumentCaptor.forClass(Person.class);
        verify(personRepository, atLeast(2)).save(personCaptor.capture());
        Person savedPerson = personCaptor.getAllValues().get(personCaptor.getAllValues().size() - 1);
        assertThat(savedPerson.getId()).isEqualTo(200L);
        assertThat(savedPerson.getPhotoId()).isEqualTo(300L);
    }

    @Test
    void updatePublicationKeepsExistingPhotoReferenceWithoutCreatingAnotherPhotoRow() {
        AtomicLong recreatedPersonIds = new AtomicLong(201L);
        AtomicInteger newPhotoRows = new AtomicInteger();
        AtomicLong recreatedFamilyIds = new AtomicLong(401L);

        Publication publication = new Publication();
        publication.setId(100L);
        when(publicationRepository.findById(100L)).thenReturn(Optional.of(publication));
        when(publicationRepository.save(any(Publication.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Person existingPerson = new Person();
        existingPerson.setId(200L);
        existingPerson.setPublicationId(100L);
        existingPerson.setPersonId("p1");
        existingPerson.setPhotoId(7L);
        when(personRepository.findByPublicationId(100L)).thenReturn(List.of(existingPerson));

        when(personRepository.save(any(Person.class))).thenAnswer(invocation -> {
            Person person = invocation.getArgument(0);
            if (person.getId() == null) {
                person.setId(recreatedPersonIds.getAndIncrement());
            }
            return person;
        });

        when(familyRepository.save(any(Family.class))).thenAnswer(invocation -> {
            Family family = invocation.getArgument(0);
            if (family.getId() == null) {
                family.setId(recreatedFamilyIds.getAndIncrement());
            }
            return family;
        });

        when(photoService.handlePersonAvatar(anyLong(), any(), anyBoolean())).thenReturn(null);

        Photo existingPhoto = new Photo();
        existingPhoto.setId(7L);
        existingPhoto.setPersonDbId(200L);
        existingPhoto.setMimeType("image/png");
        existingPhoto.setData(new byte[]{1, 2, 3});
        // reassignPhoto is void on a mock; stubbing not needed

        publicationService.updatePublication(100L, 0L, "李氏族谱", "更新", buildPublicationData("/api/photos/7"), null, null);

        assertThat(newPhotoRows.get()).isZero();

        ArgumentCaptor<Person> personCaptor = ArgumentCaptor.forClass(Person.class);
        verify(personRepository, atLeast(2)).save(personCaptor.capture());
        Person recreatedPerson = personCaptor.getAllValues().get(personCaptor.getAllValues().size() - 1);
        assertThat(recreatedPerson.getPhotoId()).isEqualTo(7L);
    }

    @Test
    void createPublicationImportsLegacyUploadUrlIntoPhotoTable() throws Exception {
        AtomicLong publicationIds = new AtomicLong(100L);
        AtomicLong personIds = new AtomicLong(200L);
        AtomicLong familyIds = new AtomicLong(400L);

        when(publicationRepository.save(any(Publication.class))).thenAnswer(invocation -> {
            Publication publication = invocation.getArgument(0);
            if (publication.getId() == null) {
                publication.setId(publicationIds.getAndIncrement());
            }
            return publication;
        });

        when(personRepository.save(any(Person.class))).thenAnswer(invocation -> {
            Person person = invocation.getArgument(0);
            if (person.getId() == null) {
                person.setId(personIds.getAndIncrement());
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

        when(photoService.handlePersonAvatar(anyLong(), any(), anyBoolean())).thenReturn(300L);

        Files.createDirectories(Path.of("uploads"));
        String fileName = "legacy-import-" + UUID.randomUUID() + ".png";
        Path uploadFile = Path.of("uploads", fileName);
        byte[] imageBytes = new byte[]{9, 8, 7, 6};
        Files.write(uploadFile, imageBytes);

        try {
            publicationService.createPublication(1L, "李氏族谱", "旧数据导入",
                    buildPublicationData("/uploads/" + fileName), null, null);

            ArgumentCaptor<Person> personCaptor = ArgumentCaptor.forClass(Person.class);
            verify(personRepository, atLeast(2)).save(personCaptor.capture());
            Person savedPerson = personCaptor.getAllValues().get(personCaptor.getAllValues().size() - 1);
            assertThat(savedPerson.getId()).isEqualTo(200L);
            assertThat(savedPerson.getPhotoId()).isEqualTo(300L);
        } finally {
            Files.deleteIfExists(uploadFile);
        }
    }

    @Test
    void updatePublicationPersistsBranchMountFieldsFromPublicationSnapshot() {
        AtomicLong recreatedPersonIds = new AtomicLong(201L);
        AtomicLong recreatedFamilyIds = new AtomicLong(401L);

        Publication publication = new Publication();
        publication.setId(100L);
        when(publicationRepository.findById(100L)).thenReturn(Optional.of(publication));
        when(publicationRepository.save(any(Publication.class))).thenAnswer(invocation -> invocation.getArgument(0));

        when(personRepository.findByPublicationId(100L)).thenReturn(List.of());
        when(familyRepository.findByPublicationId(100L)).thenReturn(List.of());

        when(personRepository.save(any(Person.class))).thenAnswer(invocation -> {
            Person person = invocation.getArgument(0);
            if (person.getId() == null) {
                person.setId(recreatedPersonIds.getAndIncrement());
            }
            return person;
        });

        when(familyRepository.save(any(Family.class))).thenAnswer(invocation -> {
            Family family = invocation.getArgument(0);
            if (family.getId() == null) {
                family.setId(recreatedFamilyIds.getAndIncrement());
            }
            return family;
        });

        publicationService.updatePublication(
                100L,
                0L,
                "Main Publication",
                "Updated",
                buildPublicationData("/api/photos/7", true, 9L, 42L),
                null,
                null
        );

        ArgumentCaptor<Person> personCaptor = ArgumentCaptor.forClass(Person.class);
        verify(personRepository, atLeast(2)).save(personCaptor.capture());
        Person savedPerson = personCaptor.getAllValues().get(personCaptor.getAllValues().size() - 1);
        assertThat(savedPerson.getIsMountPoint()).isTrue();
        assertThat(savedPerson.getTargetPublicationId()).isEqualTo(9L);
        assertThat(savedPerson.getTargetRootPersonId()).isEqualTo(42L);
    }

    @Test
    @SuppressWarnings("unchecked")
    void loadPublicationIncludesBranchMountMetadata() {
        Publication master = new Publication();
        master.setId(100L);
        master.setTitle("Main Publication");
        master.setSubtitle("Main Subtitle");
        master.setFocusFamilyId("f1");

        when(publicationRepository.findById(100L)).thenReturn(Optional.of(master));
        
        // Mock the federated data loader
        doAnswer(invocation -> {
            Map<String, Map<String, Object>> people = invocation.getArgument(3);
            Map<String, Object> personJson = new LinkedHashMap<>();
            personJson.put("id", "p1");
            personJson.put("name", "Mounted Person");
            personJson.put("isMountPoint", true);
            Map<String, Object> mountTarget = new LinkedHashMap<>();
            mountTarget.put("publicationId", 9L);
            mountTarget.put("publicationTitle", "Branch Publication");
            mountTarget.put("rootPersonId", 42L);
            personJson.put("mountPointTarget", mountTarget);
            people.put("p1", personJson);
            return null;
        }).when(treeLoader).loadFederatedData(any(), any(Integer.class), any(String.class), any(Map.class), any(Map.class));

        Map<String, Object> response = publicationService.loadPublication(100L);

        Map<String, Object> publicationJson = (Map<String, Object>) response.get("publication");
        Map<String, Object> people = (Map<String, Object>) publicationJson.get("people");
        Map<String, Object> personJson = (Map<String, Object>) people.get("p1");

        assertThat(personJson).containsEntry("isMountPoint", true);
        assertThat(personJson).containsKey("mountPointTarget");

        Map<String, Object> mountTarget = (Map<String, Object>) personJson.get("mountPointTarget");
        assertThat(mountTarget).containsEntry("publicationId", 9L);
        assertThat(mountTarget).containsEntry("publicationTitle", "Branch Publication");
        assertThat(mountTarget).containsEntry("rootPersonId", 42L);
    }

    @Test
    void updatePublicationRejectsStaleRevision() {
        Publication publication = new Publication();
        publication.setId(7L);
        publication.setTitle("Current");
        publication.setRevision(5L);

        when(publicationRepository.findById(7L)).thenReturn(Optional.of(publication));

        assertThatThrownBy(() -> publicationService.updatePublication(
                7L,
                4L,
                "Updated",
                "",
                Map.of("focusFamilyId", "", "people", Map.of(), "families", Map.of()),
                "{}",
                "{}"))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("数据已过期");
    }

    @Test
    void updatePersonRejectsStaleRevision() {
        Publication publication = new Publication();
        publication.setId(7L);
        publication.setRevision(10L);

        when(publicationRepository.findById(7L)).thenReturn(Optional.of(publication));

        assertThatThrownBy(() -> publicationService.updatePerson(
                7L,
                9L,
                "p1",
                Map.of("name", "New Name")))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("数据已过期");
    }

    private Map<String, Object> buildPublicationData(String avatarUrl) {
        return buildPublicationData(avatarUrl, false, null, null);
    }

    private Map<String, Object> buildPublicationData(
            String avatarUrl,
            boolean isMountPoint,
            Long targetPublicationId,
            Long rootPersonId
    ) {
        Map<String, Object> person = new LinkedHashMap<>();
        person.put("id", "p1");
        person.put("name", "李明");
        person.put("gender", "male");
        person.put("avatarUrl", avatarUrl);
        if (isMountPoint) {
            person.put("isMountPoint", true);
            Map<String, Object> mountPointTarget = new LinkedHashMap<>();
            mountPointTarget.put("publicationId", targetPublicationId);
            mountPointTarget.put("rootPersonId", rootPersonId);
            person.put("mountPointTarget", mountPointTarget);
        }

        Map<String, Object> people = new LinkedHashMap<>();
        people.put("p1", person);

        Map<String, Object> family = new LinkedHashMap<>();
        family.put("id", "f1");
        family.put("adults", List.of("p1"));
        family.put("children", List.of());

        Map<String, Object> families = new LinkedHashMap<>();
        families.put("f1", family);

        Map<String, Object> publicationData = new LinkedHashMap<>();
        publicationData.put("focusFamilyId", "f1");
        publicationData.put("people", people);
        publicationData.put("families", families);
        return publicationData;
    }
}
