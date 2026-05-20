package com.genealogy.server.service;

import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.ChangeRequest;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.PersonAccount;
import com.genealogy.server.model.Publication;
import com.genealogy.server.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class ProfileService {

    private static final Logger log = LoggerFactory.getLogger(ProfileService.class);

    private final PersonAccountRepository personAccountRepository;
    private final PersonRepository personRepository;
    private final PublicationRepository publicationRepository;
    private final ChangeRequestRepository changeRequestRepository;

    public ProfileService(PersonAccountRepository personAccountRepository,
                          PersonRepository personRepository,
                          PublicationRepository publicationRepository,
                          ChangeRequestRepository changeRequestRepository) {
        this.personAccountRepository = personAccountRepository;
        this.personRepository = personRepository;
        this.publicationRepository = publicationRepository;
        this.changeRequestRepository = changeRequestRepository;
    }

    public Map<String, Object> getMyProfile(Long userId) {
        PersonAccount pa = personAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("当前账号未关联族谱人物"));

        Person person = personRepository.findById(pa.getPersonDbId())
                .orElseThrow(() -> new NotFoundException("关联的人物记录不存在"));

        Publication pub = publicationRepository.findById(pa.getPublicationId())
                .orElse(null);

        boolean hasPending = changeRequestRepository.existsByPersonDbIdAndStatus(person.getId(), "pending");

        Map<String, Object> personData = new LinkedHashMap<>();
        personData.put("name", person.getName());
        personData.put("gender", person.getGender());
        personData.put("birth", person.getBirth());
        personData.put("death", person.getDeath());
        personData.put("deceased", Boolean.TRUE.equals(person.getDeceased()));
        personData.put("note", person.getNote());
        if (person.getPhotoId() != null) {
            personData.put("avatarUrl", "/api/photos/" + person.getPhotoId());
        }

        Map<String, Object> pubData = new LinkedHashMap<>();
        pubData.put("id", pa.getPublicationId());
        pubData.put("title", pub != null ? pub.getTitle() : "");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("person", personData);
        result.put("publication", pubData);
        result.put("hasPendingChanges", hasPending);
        result.put("personDbId", person.getId());

        return result;
    }

    @Transactional
    public void submitProfileChange(Long userId, Map<String, Object> changes) {
        PersonAccount pa = personAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("当前账号未关联族谱人物"));

        Person person = personRepository.findById(pa.getPersonDbId())
                .orElseThrow(() -> new NotFoundException("关联的人物记录不存在"));

        if (changeRequestRepository.existsByPersonDbIdAndStatus(person.getId(), "pending")) {
            throw new BadRequestException("已有待审核的修改，请等待审核完成后再提交");
        }

        Long pubId = pa.getPublicationId();

        for (Map.Entry<String, Object> entry : changes.entrySet()) {
            String field = entry.getKey();
            String newValue = entry.getValue() != null ? entry.getValue().toString() : null;

            String oldValue = switch (field) {
                case "name" -> person.getName();
                case "gender" -> person.getGender();
                case "birth" -> person.getBirth();
                case "death" -> person.getDeath();
                case "deceased" -> person.getDeceased() != null ? person.getDeceased().toString() : "false";
                case "note" -> person.getNote();
                default -> null;
            };

            if (newValue == null && oldValue == null) continue;
            if (newValue != null && newValue.equals(oldValue)) continue;

            ChangeRequest cr = new ChangeRequest();
            cr.setPublicationId(pubId);
            cr.setPersonDbId(person.getId());
            cr.setFieldName(field);
            cr.setOldValue(oldValue);
            cr.setNewValue(newValue);
            cr.setSubmittedBy(userId);
            changeRequestRepository.save(cr);
        }

        log.info("User {} submitted profile changes for person {} in publication {}", userId, person.getId(), pubId);
    }
}
