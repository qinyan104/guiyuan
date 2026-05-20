package com.genealogy.server.service;

import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.ChangeRequest;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.ChangeRequestRepository;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewService.class);

    private final ChangeRequestRepository changeRequestRepository;
    private final PersonRepository personRepository;
    private final UserRepository userRepository;

    public ReviewService(ChangeRequestRepository changeRequestRepository,
                         PersonRepository personRepository,
                         UserRepository userRepository) {
        this.changeRequestRepository = changeRequestRepository;
        this.personRepository = personRepository;
        this.userRepository = userRepository;
    }

    public List<Map<String, Object>> listReviews(Long publicationId, String status) {
        List<ChangeRequest> requests;
        if (status != null && !status.isEmpty()) {
            requests = changeRequestRepository.findByPublicationIdAndStatus(publicationId, status);
        } else {
            requests = changeRequestRepository.findByPublicationId(publicationId);
        }

        Map<Long, String> personNames = new HashMap<>();
        Map<Long, String> userNames = new HashMap<>();

        return requests.stream()
                .sorted(Comparator.comparing(ChangeRequest::getCreatedAt).reversed())
                .map(cr -> {
                    String personName = personNames.computeIfAbsent(cr.getPersonDbId(),
                            id -> personRepository.findById(id).map(Person::getName).orElse("未知"));
                    String submitterName = userNames.computeIfAbsent(cr.getSubmittedBy(),
                            id -> userRepository.findById(id).map(User::getUsername).orElse("未知"));

                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", cr.getId());
                    row.put("personDbId", cr.getPersonDbId());
                    row.put("personName", personName);
                    row.put("fieldName", cr.getFieldName());
                    row.put("oldValue", cr.getOldValue());
                    row.put("newValue", cr.getNewValue());
                    row.put("status", cr.getStatus());
                    row.put("submittedBy", cr.getSubmittedBy());
                    row.put("submitterName", submitterName);
                    row.put("reviewedBy", cr.getReviewedBy());
                    row.put("rejectReason", cr.getRejectReason());
                    row.put("createdAt", cr.getCreatedAt());
                    row.put("reviewedAt", cr.getReviewedAt());
                    return row;
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> getReviewDetail(Long requestId) {
        ChangeRequest cr = changeRequestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("审批记录不存在"));

        String personName = personRepository.findById(cr.getPersonDbId())
                .map(Person::getName).orElse("未知");
        String submitterName = userRepository.findById(cr.getSubmittedBy())
                .map(User::getUsername).orElse("未知");

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("id", cr.getId());
        detail.put("personDbId", cr.getPersonDbId());
        detail.put("personName", personName);
        detail.put("fieldName", cr.getFieldName());
        detail.put("oldValue", cr.getOldValue());
        detail.put("newValue", cr.getNewValue());
        detail.put("status", cr.getStatus());
        detail.put("submittedBy", cr.getSubmittedBy());
        detail.put("submitterName", submitterName);
        detail.put("reviewedBy", cr.getReviewedBy());
        detail.put("rejectReason", cr.getRejectReason());
        detail.put("createdAt", cr.getCreatedAt());
        detail.put("reviewedAt", cr.getReviewedAt());
        return detail;
    }

    @Transactional
    public void approve(Long requestId, Long reviewerId) {
        ChangeRequest cr = changeRequestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("审批记录不存在"));

        if (!"pending".equals(cr.getStatus())) {
            throw new BadRequestException("该修改已被处理");
        }

        Person person = personRepository.findById(cr.getPersonDbId())
                .orElseThrow(() -> new NotFoundException("人物记录不存在"));

        String field = cr.getFieldName();
        String value = cr.getNewValue();

        switch (field) {
            case "name" -> person.setName(value != null ? value : "");
            case "gender" -> person.setGender(value != null ? value : "unknown");
            case "birth" -> person.setBirth(value);
            case "death" -> person.setDeath(value);
            case "deceased" -> person.setDeceased("true".equals(value));
            case "note" -> person.setNote(value);
            default -> log.warn("Unknown field in change request: {}", field);
        }

        personRepository.save(person);

        cr.setStatus("approved");
        cr.setReviewedBy(reviewerId);
        cr.setReviewedAt(LocalDateTime.now());
        changeRequestRepository.save(cr);

        log.info("Approved change request {} for person {} field {}", requestId, person.getId(), field);
    }

    @Transactional
    public void reject(Long requestId, Long reviewerId, String reason) {
        ChangeRequest cr = changeRequestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("审批记录不存在"));

        if (!"pending".equals(cr.getStatus())) {
            throw new BadRequestException("该修改已被处理");
        }

        cr.setStatus("rejected");
        cr.setReviewedBy(reviewerId);
        cr.setReviewedAt(LocalDateTime.now());
        cr.setRejectReason(reason);
        changeRequestRepository.save(cr);

        log.info("Rejected change request {} with reason: {}", requestId, reason);
    }

    @Transactional
    public void batchAction(List<Long> ids, String action, Long reviewerId, String reason) {
        for (Long id : ids) {
            if ("approve".equals(action)) {
                approve(id, reviewerId);
            } else if ("reject".equals(action)) {
                reject(id, reviewerId, reason);
            } else {
                throw new BadRequestException("无效的操作: " + action);
            }
        }
    }
}
