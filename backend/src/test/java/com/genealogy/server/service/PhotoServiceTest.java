package com.genealogy.server.service;

import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.model.Photo;
import com.genealogy.server.repository.PhotoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Base64;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PhotoServiceTest {

    private static final long PERSON_DB_ID = 9L;
    private static final long OTHER_PERSON_DB_ID = 5L;

    @Mock
    private PhotoRepository photoRepository;

    private PhotoService service;

    @BeforeEach
    void setUp() {
        service = new PhotoService(photoRepository);
    }

    @Test
    void apiPhotoUrlOwnedByAnotherPerson_isClonedInsteadOfReassigned() {
        Photo ownedByOther = photo(100L, OTHER_PERSON_DB_ID);
        when(photoRepository.findById(100L)).thenReturn(Optional.of(ownedByOther));
        when(photoRepository.save(any(Photo.class))).thenAnswer(invocation -> {
            Photo saved = invocation.getArgument(0);
            saved.setId(200L);
            return saved;
        });

        Long result = service.handlePersonAvatar(PERSON_DB_ID, "/api/photos/100", false);

        assertThat(result).isEqualTo(200L);
        assertThat(ownedByOther.getPersonDbId())
                .as("原照片必须仍属于原主人，不能被改绑")
                .isEqualTo(OTHER_PERSON_DB_ID);

        ArgumentCaptor<Photo> saved = ArgumentCaptor.forClass(Photo.class);
        verify(photoRepository).save(saved.capture());
        assertThat(saved.getValue().getPersonDbId()).isEqualTo(PERSON_DB_ID);
    }

    @Test
    void apiPhotoUrlOwnedBySamePerson_isReassignedInPlace() {
        Photo ownedBySelf = photo(100L, PERSON_DB_ID);
        when(photoRepository.findById(100L)).thenReturn(Optional.of(ownedBySelf));
        when(photoRepository.save(any(Photo.class))).thenReturn(ownedBySelf);

        Long result = service.handlePersonAvatar(PERSON_DB_ID, "/api/photos/100", false);

        assertThat(result).isEqualTo(100L);
        verify(photoRepository).save(ownedBySelf);
    }

    @Test
    void apiPhotoUrlWithoutOwner_isReassignedInPlace() {
        Photo unassigned = photo(100L, null);
        when(photoRepository.findById(100L)).thenReturn(Optional.of(unassigned));
        when(photoRepository.save(any(Photo.class))).thenReturn(unassigned);

        Long result = service.handlePersonAvatar(PERSON_DB_ID, "/api/photos/100", false);

        assertThat(result).isEqualTo(100L);
        assertThat(unassigned.getPersonDbId()).isEqualTo(PERSON_DB_ID);
    }

    @Test
    void apiPhotoUrlWithCloneFlag_alwaysClonesEvenWhenOwnedBySelf() {
        Photo ownedBySelf = photo(100L, PERSON_DB_ID);
        when(photoRepository.findById(100L)).thenReturn(Optional.of(ownedBySelf));
        when(photoRepository.save(any(Photo.class))).thenAnswer(invocation -> {
            Photo saved = invocation.getArgument(0);
            saved.setId(300L);
            return saved;
        });

        Long result = service.handlePersonAvatar(PERSON_DB_ID, "/api/photos/100", true);

        assertThat(result).isEqualTo(300L);
    }

    @Test
    void apiPhotoUrlWithNonNumericId_returnsNullWithoutThrowing() {
        assertThat(service.handlePersonAvatar(PERSON_DB_ID, "/api/photos/abc", false)).isNull();
    }

    @Test
    void base64AvatarWithoutSeparator_throwsBadRequest() {
        assertThatThrownBy(() -> service.handlePersonAvatar(PERSON_DB_ID, "data:image/png;base64", false))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("分隔符");
    }

    @Test
    void base64AvatarWithUndecodablePayload_throwsBadRequest() {
        assertThatThrownBy(() -> service.handlePersonAvatar(PERSON_DB_ID, "data:image/png;base64,AAAAA", false))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("无法解码");
    }

    @Test
    void base64AvatarWithValidPayload_isStored() {
        String payload = Base64.getEncoder().encodeToString(new byte[]{1, 2, 3});
        when(photoRepository.save(any(Photo.class))).thenAnswer(invocation -> {
            Photo saved = invocation.getArgument(0);
            saved.setId(7L);
            return saved;
        });

        Long result = service.handlePersonAvatar(PERSON_DB_ID, "data:image/png;base64," + payload, false);

        assertThat(result).isEqualTo(7L);
        ArgumentCaptor<Photo> saved = ArgumentCaptor.forClass(Photo.class);
        verify(photoRepository).save(saved.capture());
        assertThat(saved.getValue().getMimeType()).isEqualTo("image/png");
        assertThat(saved.getValue().getPersonDbId()).isEqualTo(PERSON_DB_ID);
    }

    private Photo photo(Long id, Long personDbId) {
        Photo photo = new Photo();
        photo.setId(id);
        photo.setPersonDbId(personDbId);
        photo.setMimeType("image/jpeg");
        photo.setData(new byte[]{1, 2, 3});
        return photo;
    }
}
