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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeast;
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
                authorizationService
        );
    }

    @Test
    void createPublicationClonesReferencedPhotoWhenImportUsesApiPhotoUrl() {
        AtomicLong publicationIds = new AtomicLong(100L);
        AtomicLong personIds = new AtomicLong(200L);
        AtomicLong photoIds = new AtomicLong(300L);
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

        when(photoRepository.save(any(Photo.class))).thenAnswer(invocation -> {
            Photo photo = invocation.getArgument(0);
            if (photo.getId() == null) {
                photo.setId(photoIds.getAndIncrement());
            }
            return photo;
        });

        Photo existingPhoto = new Photo();
        existingPhoto.setId(7L);
        existingPhoto.setPersonDbId(999L);
        existingPhoto.setMimeType("image/png");
        existingPhoto.setData(new byte[]{1, 2, 3});
        when(photoRepository.findById(7L)).thenReturn(Optional.of(existingPhoto));

        Map<String, Object> publicationData = buildPublicationData("/api/photos/7");

        Long publicationId = publicationService.createPublication(1L, "李氏族谱", "测试导入", publicationData, null, null);

        assertThat(publicationId).isEqualTo(100L);

        ArgumentCaptor<Photo> photoCaptor = ArgumentCaptor.forClass(Photo.class);
        verify(photoRepository).save(photoCaptor.capture());
        Photo clonedPhoto = photoCaptor.getValue();
        assertThat(clonedPhoto.getId()).isEqualTo(300L);
        assertThat(clonedPhoto.getPersonDbId()).isEqualTo(200L);
        assertThat(clonedPhoto.getMimeType()).isEqualTo("image/png");
        assertThat(clonedPhoto.getData()).containsExactly(1, 2, 3);

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

        Photo existingPhoto = new Photo();
        existingPhoto.setId(7L);
        existingPhoto.setPersonDbId(200L);
        existingPhoto.setMimeType("image/png");
        existingPhoto.setData(new byte[]{1, 2, 3});
        when(photoRepository.findById(7L)).thenReturn(Optional.of(existingPhoto));
        when(photoRepository.save(any(Photo.class))).thenAnswer(invocation -> {
            Photo photo = invocation.getArgument(0);
            if (photo.getId() == null) {
                newPhotoRows.incrementAndGet();
                photo.setId(999L);
            }
            return photo;
        });

        publicationService.updatePublication(100L, "李氏族谱", "更新", buildPublicationData("/api/photos/7"), null, null);

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
        AtomicLong photoIds = new AtomicLong(300L);
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

        when(photoRepository.save(any(Photo.class))).thenAnswer(invocation -> {
            Photo photo = invocation.getArgument(0);
            if (photo.getId() == null) {
                photo.setId(photoIds.getAndIncrement());
            }
            return photo;
        });

        Files.createDirectories(Path.of("uploads"));
        String fileName = "legacy-import-" + UUID.randomUUID() + ".png";
        Path uploadFile = Path.of("uploads", fileName);
        byte[] imageBytes = new byte[]{9, 8, 7, 6};
        Files.write(uploadFile, imageBytes);

        try {
            publicationService.createPublication(1L, "李氏族谱", "旧数据导入",
                    buildPublicationData("/uploads/" + fileName), null, null);

            ArgumentCaptor<Photo> photoCaptor = ArgumentCaptor.forClass(Photo.class);
            verify(photoRepository).save(photoCaptor.capture());
            Photo savedPhoto = photoCaptor.getValue();
            assertThat(savedPhoto.getId()).isEqualTo(300L);
            assertThat(savedPhoto.getPersonDbId()).isEqualTo(200L);
            assertThat(savedPhoto.getMimeType()).isEqualTo("image/png");
            assertThat(savedPhoto.getData()).containsExactly(imageBytes);
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

        Publication target = new Publication();
        target.setId(9L);
        target.setTitle("Branch Publication");

        Person person = new Person();
        person.setId(200L);
        person.setPublicationId(100L);
        person.setPersonId("p1");
        person.setName("Mounted Person");
        person.setGender("male");
        person.setIsMountPoint(true);
        person.setTargetPublicationId(9L);
        person.setTargetRootPersonId(42L);

        when(publicationRepository.findById(100L)).thenReturn(Optional.of(master));
        when(publicationRepository.findById(9L)).thenReturn(Optional.of(target));
        when(personRepository.findByPublicationId(100L)).thenReturn(List.of(person));
        when(familyRepository.findByPublicationId(100L)).thenReturn(List.of());

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
