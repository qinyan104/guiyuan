package com.genealogy.server.service;

import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.ChangeRequest;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.ChangeRequestRepository;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock private ChangeRequestRepository changeRequestRepository;
    @Mock private PersonRepository personRepository;
    @Mock private UserRepository userRepository;
    @InjectMocks private ReviewService reviewService;

    // ---- Helpers ----

    private ChangeRequest makeChangeRequest(Long id, Long personDbId, String fieldName,
                                             String oldValue, String newValue,
                                             String status, Long submittedBy) {
        ChangeRequest cr = new ChangeRequest();
        cr.setId(id);
        cr.setPublicationId(1L);
        cr.setPersonDbId(personDbId);
        cr.setFieldName(fieldName);
        cr.setOldValue(oldValue);
        cr.setNewValue(newValue);
        cr.setStatus(status);
        cr.setSubmittedBy(submittedBy);
        cr.setCreatedAt(LocalDateTime.now());
        return cr;
    }

    private Person makePerson(Long id, String name) {
        Person p = new Person();
        p.setId(id);
        p.setName(name);
        return p;
    }

    private User makeUser(Long id, String username) {
        User u = new User();
        u.setId(id);
        u.setUsername(username);
        return u;
    }

    // ==================== listReviews ====================

    @Test
    void listReviews_withStatusFilter_returnsMatchingRequests() {
        ChangeRequest cr1 = makeChangeRequest(1L, 10L, "name", "旧名", "新名", "pending", 1L);
        cr1.setCreatedAt(LocalDateTime.of(2024, 6, 1, 10, 0)); // 确保 cr1 排在前面
        ChangeRequest cr2 = makeChangeRequest(2L, 11L, "gender", "male", "female", "pending", 2L);
        cr2.setCreatedAt(LocalDateTime.of(2024, 1, 1, 10, 0));
        when(changeRequestRepository.findByPublicationIdAndStatus(1L, "pending"))
                .thenReturn(Arrays.asList(cr1, cr2));
        when(personRepository.findById(10L)).thenReturn(Optional.of(makePerson(10L, "张三")));
        when(personRepository.findById(11L)).thenReturn(Optional.of(makePerson(11L, "李四")));
        when(userRepository.findById(1L)).thenReturn(Optional.of(makeUser(1L, "alice")));
        when(userRepository.findById(2L)).thenReturn(Optional.of(makeUser(2L, "bob")));

        List<Map<String, Object>> results = reviewService.listReviews(1L, "pending");

        assertEquals(2, results.size());
        Map<String, Object> first = results.get(0);
        assertEquals(1L, first.get("id"));
        assertEquals("张三", first.get("personName"));
        assertEquals("name", first.get("fieldName"));
        assertEquals("pending", first.get("status"));
        assertEquals("alice", first.get("submitterName"));

        verify(changeRequestRepository).findByPublicationIdAndStatus(1L, "pending");
        verify(changeRequestRepository, never()).findByPublicationId(anyLong());
    }

    @Test
    void listReviews_nullStatus_returnsAll() {
        when(changeRequestRepository.findByPublicationId(1L))
                .thenReturn(Collections.emptyList());

        List<Map<String, Object>> results = reviewService.listReviews(1L, null);

        assertTrue(results.isEmpty());
        verify(changeRequestRepository).findByPublicationId(1L);
    }

    @Test
    void listReviews_emptyStatus_returnsAll() {
        when(changeRequestRepository.findByPublicationId(1L))
                .thenReturn(Collections.emptyList());

        List<Map<String, Object>> results = reviewService.listReviews(1L, "");

        assertTrue(results.isEmpty());
        verify(changeRequestRepository).findByPublicationId(1L);
    }

    @Test
    void listReviews_unknownPerson_showsDefault() {
        ChangeRequest cr = makeChangeRequest(1L, 99L, "name", "old", "new", "pending", 1L);
        when(changeRequestRepository.findByPublicationId(1L))
                .thenReturn(Arrays.asList(cr));
        when(personRepository.findById(99L)).thenReturn(Optional.empty());
        when(userRepository.findById(1L)).thenReturn(Optional.of(makeUser(1L, "alice")));

        List<Map<String, Object>> results = reviewService.listReviews(1L, null);

        assertEquals(1, results.size());
        assertEquals("未知", results.get(0).get("personName"));
    }

    @Test
    void listReviews_unknownSubmitter_showsDefault() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "name", "old", "new", "pending", 99L);
        when(changeRequestRepository.findByPublicationId(1L))
                .thenReturn(Arrays.asList(cr));
        when(personRepository.findById(10L)).thenReturn(Optional.of(makePerson(10L, "张三")));
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        List<Map<String, Object>> results = reviewService.listReviews(1L, null);

        assertEquals(1, results.size());
        assertEquals("未知", results.get(0).get("submitterName"));
    }

    @Test
    void listReviews_sortedByCreatedAtDesc() {
        ChangeRequest cr1 = makeChangeRequest(1L, 10L, "name", "a", "b", "pending", 1L);
        cr1.setCreatedAt(LocalDateTime.of(2024, 1, 1, 10, 0));
        ChangeRequest cr2 = makeChangeRequest(2L, 10L, "gender", "m", "f", "pending", 1L);
        cr2.setCreatedAt(LocalDateTime.of(2024, 6, 1, 10, 0));
        when(changeRequestRepository.findByPublicationId(1L))
                .thenReturn(Arrays.asList(cr1, cr2));
        when(personRepository.findById(10L)).thenReturn(Optional.of(makePerson(10L, "张三")));
        when(userRepository.findById(1L)).thenReturn(Optional.of(makeUser(1L, "alice")));

        List<Map<String, Object>> results = reviewService.listReviews(1L, null);

        // cr2 has later date so should come first
        assertEquals(2L, results.get(0).get("id"));
        assertEquals(1L, results.get(1).get("id"));
    }

    // ==================== getReviewDetail ====================

    @Test
    void getReviewDetail_existing_returnsDetail() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "birth", "1990", "1991", "approved", 1L);
        cr.setReviewedBy(2L);
        cr.setReviewedAt(LocalDateTime.of(2024, 6, 1, 12, 0));
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr));
        when(personRepository.findById(10L)).thenReturn(Optional.of(makePerson(10L, "张三")));
        when(userRepository.findById(1L)).thenReturn(Optional.of(makeUser(1L, "alice")));

        Map<String, Object> detail = reviewService.getReviewDetail(1L);

        assertEquals(1L, detail.get("id"));
        assertEquals("张三", detail.get("personName"));
        assertEquals("birth", detail.get("fieldName"));
        assertEquals("1990", detail.get("oldValue"));
        assertEquals("1991", detail.get("newValue"));
        assertEquals("approved", detail.get("status"));
        assertEquals("alice", detail.get("submitterName"));
        assertEquals(2L, detail.get("reviewedBy"));
    }

    @Test
    void getReviewDetail_notFound_throws() {
        when(changeRequestRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> reviewService.getReviewDetail(99L));
    }

    @Test
    void getReviewDetail_containsAllExpectedKeys() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "name", "old", "new", "pending", 1L);
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr));
        when(personRepository.findById(10L)).thenReturn(Optional.of(makePerson(10L, "张三")));
        when(userRepository.findById(1L)).thenReturn(Optional.of(makeUser(1L, "alice")));

        Map<String, Object> detail = reviewService.getReviewDetail(1L);

        assertTrue(detail.containsKey("id"));
        assertTrue(detail.containsKey("personDbId"));
        assertTrue(detail.containsKey("personName"));
        assertTrue(detail.containsKey("fieldName"));
        assertTrue(detail.containsKey("oldValue"));
        assertTrue(detail.containsKey("newValue"));
        assertTrue(detail.containsKey("status"));
        assertTrue(detail.containsKey("submittedBy"));
        assertTrue(detail.containsKey("submitterName"));
        assertTrue(detail.containsKey("reviewedBy"));
        assertTrue(detail.containsKey("rejectReason"));
        assertTrue(detail.containsKey("createdAt"));
        assertTrue(detail.containsKey("reviewedAt"));
    }

    // ==================== approve ====================

    @Test
    void approve_nameField_updatesPersonName() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "name", "旧名", "新名", "pending", 1L);
        Person person = makePerson(10L, "旧名");
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr));
        when(personRepository.findById(10L)).thenReturn(Optional.of(person));

        reviewService.approve(1L, 2L);

        assertEquals("新名", person.getName());
        verify(personRepository).save(person);

        assertEquals("approved", cr.getStatus());
        assertEquals(2L, cr.getReviewedBy());
        assertNotNull(cr.getReviewedAt());
        verify(changeRequestRepository).save(cr);
    }

    @Test
    void approve_genderField_updatesGender() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "gender", "male", "female", "pending", 1L);
        Person person = makePerson(10L, "张三");
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr));
        when(personRepository.findById(10L)).thenReturn(Optional.of(person));

        reviewService.approve(1L, 2L);

        assertEquals("female", person.getGender());
    }

    @Test
    void approve_birthField_updatesBirth() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "birth", "1990", "1991", "pending", 1L);
        Person person = makePerson(10L, "张三");
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr));
        when(personRepository.findById(10L)).thenReturn(Optional.of(person));

        reviewService.approve(1L, 2L);

        assertEquals("1991", person.getBirth());
    }

    @Test
    void approve_deathField_updatesDeath() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "death", null, "2020", "pending", 1L);
        Person person = makePerson(10L, "张三");
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr));
        when(personRepository.findById(10L)).thenReturn(Optional.of(person));

        reviewService.approve(1L, 2L);

        assertEquals("2020", person.getDeath());
    }

    @Test
    void approve_deceasedField_updatesDeceased() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "deceased", "false", "true", "pending", 1L);
        Person person = makePerson(10L, "张三");
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr));
        when(personRepository.findById(10L)).thenReturn(Optional.of(person));

        reviewService.approve(1L, 2L);

        assertTrue(person.getDeceased());
    }

    @Test
    void approve_noteField_updatesNote() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "note", null, "some note", "pending", 1L);
        Person person = makePerson(10L, "张三");
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr));
        when(personRepository.findById(10L)).thenReturn(Optional.of(person));

        reviewService.approve(1L, 2L);

        assertEquals("some note", person.getNote());
    }

    @Test
    void approve_notPending_throws() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "name", "a", "b", "approved", 1L);
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr));

        assertThrows(BadRequestException.class, () -> reviewService.approve(1L, 2L));
        verify(personRepository, never()).save(any());
    }

    @Test
    void approve_notFound_throws() {
        when(changeRequestRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> reviewService.approve(99L, 2L));
    }

    @Test
    void approve_personNotFound_throws() {
        ChangeRequest cr = makeChangeRequest(1L, 99L, "name", "a", "b", "pending", 1L);
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr));
        when(personRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> reviewService.approve(1L, 2L));
    }

    // ==================== reject ====================

    @Test
    void reject_setsStatusAndReason() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "name", "旧", "新", "pending", 1L);
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr));

        reviewService.reject(1L, 2L, "数据不准确");

        assertEquals("rejected", cr.getStatus());
        assertEquals(2L, cr.getReviewedBy());
        assertEquals("数据不准确", cr.getRejectReason());
        assertNotNull(cr.getReviewedAt());
        verify(changeRequestRepository).save(cr);
    }

    @Test
    void reject_notPending_throws() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "name", "a", "b", "rejected", 1L);
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr));

        assertThrows(BadRequestException.class,
                () -> reviewService.reject(1L, 2L, "reason"));
        verify(changeRequestRepository, never()).save(any());
    }

    @Test
    void reject_notFound_throws() {
        when(changeRequestRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class,
                () -> reviewService.reject(99L, 2L, "reason"));
    }

    @Test
    void reject_nullReason_storesNull() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "name", "a", "b", "pending", 1L);
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr));

        reviewService.reject(1L, 2L, null);

        assertNull(cr.getRejectReason());
        assertEquals("rejected", cr.getStatus());
    }

    // ==================== batchAction ====================

    @Test
    void batchAction_approve_approvesAll() {
        ChangeRequest cr1 = makeChangeRequest(1L, 10L, "name", "a", "b", "pending", 1L);
        ChangeRequest cr2 = makeChangeRequest(2L, 11L, "gender", "m", "f", "pending", 1L);
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr1));
        when(changeRequestRepository.findById(2L)).thenReturn(Optional.of(cr2));
        when(personRepository.findById(10L)).thenReturn(Optional.of(makePerson(10L, "张三")));
        when(personRepository.findById(11L)).thenReturn(Optional.of(makePerson(11L, "李四")));

        reviewService.batchAction(Arrays.asList(1L, 2L), "approve", 2L, null);

        assertEquals("approved", cr1.getStatus());
        assertEquals("approved", cr2.getStatus());
        verify(personRepository, times(2)).save(any(Person.class));
        verify(changeRequestRepository, times(2)).save(any(ChangeRequest.class));
    }

    @Test
    void batchAction_reject_rejectsAll() {
        ChangeRequest cr1 = makeChangeRequest(1L, 10L, "name", "a", "b", "pending", 1L);
        ChangeRequest cr2 = makeChangeRequest(2L, 11L, "gender", "m", "f", "pending", 1L);
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr1));
        when(changeRequestRepository.findById(2L)).thenReturn(Optional.of(cr2));

        reviewService.batchAction(Arrays.asList(1L, 2L), "reject", 2L, "错误数据");

        assertEquals("rejected", cr1.getStatus());
        assertEquals("rejected", cr2.getStatus());
        assertEquals("错误数据", cr1.getRejectReason());
        assertEquals("错误数据", cr2.getRejectReason());
    }

    @Test
    void batchAction_invalidAction_throws() {
        assertThrows(BadRequestException.class,
                () -> reviewService.batchAction(Arrays.asList(1L), "invalid", 2L, null));
    }

    @Test
    void batchAction_emptyList_noOp() {
        reviewService.batchAction(Collections.emptyList(), "approve", 2L, null);

        verify(changeRequestRepository, never()).findById(anyLong());
    }

    @Test
    void batchAction_partialFailure_propagatesException() {
        ChangeRequest cr1 = makeChangeRequest(1L, 10L, "name", "a", "b", "pending", 1L);
        ChangeRequest cr2 = makeChangeRequest(2L, 11L, "gender", "m", "f", "approved", 1L);
        when(changeRequestRepository.findById(1L)).thenReturn(Optional.of(cr1));
        when(changeRequestRepository.findById(2L)).thenReturn(Optional.of(cr2));
        when(personRepository.findById(10L)).thenReturn(Optional.of(makePerson(10L, "张三")));

        // First succeeds, second fails because already "approved"
        assertThrows(BadRequestException.class,
                () -> reviewService.batchAction(Arrays.asList(1L, 2L), "approve", 2L, null));

        // First one should have been approved
        assertEquals("approved", cr1.getStatus());
    }

    // ==================== listReviews field mapping ====================

    @Test
    void listReviews_containsAllExpectedFields() {
        ChangeRequest cr = makeChangeRequest(1L, 10L, "name", "旧", "新", "pending", 1L);
        cr.setReviewedBy(null);
        cr.setRejectReason(null);
        when(changeRequestRepository.findByPublicationId(1L)).thenReturn(Arrays.asList(cr));
        when(personRepository.findById(10L)).thenReturn(Optional.of(makePerson(10L, "张三")));
        when(userRepository.findById(1L)).thenReturn(Optional.of(makeUser(1L, "alice")));

        List<Map<String, Object>> results = reviewService.listReviews(1L, null);

        Map<String, Object> row = results.get(0);
        assertTrue(row.containsKey("id"));
        assertTrue(row.containsKey("personDbId"));
        assertTrue(row.containsKey("personName"));
        assertTrue(row.containsKey("fieldName"));
        assertTrue(row.containsKey("oldValue"));
        assertTrue(row.containsKey("newValue"));
        assertTrue(row.containsKey("status"));
        assertTrue(row.containsKey("submittedBy"));
        assertTrue(row.containsKey("submitterName"));
        assertTrue(row.containsKey("reviewedBy"));
        assertTrue(row.containsKey("rejectReason"));
        assertTrue(row.containsKey("createdAt"));
        assertTrue(row.containsKey("reviewedAt"));
    }
}
