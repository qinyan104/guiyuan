package com.genealogy.server.service;

import com.genealogy.server.model.Family;
import com.genealogy.server.model.FamilyMember;
import com.genealogy.server.model.Person;
import com.genealogy.server.repository.FamilyMemberRepository;
import com.genealogy.server.repository.FamilyRepository;
import com.genealogy.server.repository.PersonRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class PublicationTreeLoader {

    private final PersonRepository personRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final com.genealogy.server.repository.PublicationRepository publicationRepository;
    private final PublicationService publicationService;

    public PublicationTreeLoader(PersonRepository personRepository,
                                 FamilyRepository familyRepository,
                                 FamilyMemberRepository familyMemberRepository,
                                 com.genealogy.server.repository.PublicationRepository publicationRepository,
                                 @Lazy PublicationService publicationService) {
        this.personRepository = personRepository;
        this.familyRepository = familyRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.publicationRepository = publicationRepository;
        this.publicationService = publicationService;
    }

    public void loadFederatedData(Long publicationId, 
                                  int maxDepth, 
                                  String idPrefix, 
                                  Map<String, Map<String, Object>> allPeople, 
                                  Map<String, Map<String, Object>> allFamilies) {
        loadRecursive(publicationId, null, 0, maxDepth, idPrefix, allPeople, allFamilies);
    }

    private void loadRecursive(Long publicationId, 
                               Long rootPersonDbId,
                               int currentDepth, 
                               int maxDepth, 
                               String idPrefix, 
                               Map<String, Map<String, Object>> allPeople, 
                               Map<String, Map<String, Object>> allFamilies) {
        if (currentDepth > maxDepth) {
            return;
        }

        List<Person> personEntities;
        List<Family> familyEntities;
        
        if (rootPersonDbId != null) {
            PublicationService.SubtreeResult subtree = publicationService.collectSubtreeIds(rootPersonDbId);
            personEntities = personRepository.findAllById(subtree.getPersonDbIds());
            familyEntities = familyRepository.findAllById(subtree.getFamilyDbIds());
        } else {
            personEntities = personRepository.findByPublicationId(publicationId);
            familyEntities = familyRepository.findByPublicationId(publicationId);
        }
        
        Map<Long, String> dbIdToFederatedId = new HashMap<>();

        for (Person person : personEntities) {
            String federatedId = idPrefix + person.getPersonId();
            dbIdToFederatedId.put(person.getId(), federatedId);

            Map<String, Object> personJson = new LinkedHashMap<>();
            personJson.put("id", federatedId);
            personJson.put("dbId", person.getId());
            personJson.put("name", person.getName());
            personJson.put("gender", person.getGender());
            if (person.getBirth() != null) personJson.put("birth", person.getBirth());
            if (person.getDeath() != null) personJson.put("death", person.getDeath());
            if (Boolean.TRUE.equals(person.getDeceased())) personJson.put("deceased", true);
            if (person.getAge() != null) personJson.put("age", person.getAge());
            if (person.getTitleName() != null) personJson.put("titleName", person.getTitleName());
            if (person.getClan() != null) personJson.put("clan", person.getClan());
            if (person.getNote() != null) personJson.put("note", person.getNote());
            if (person.getHighlightRole() != null) personJson.put("highlightRole", person.getHighlightRole());
            if (person.getPhotoId() != null) personJson.put("avatarUrl", "/api/photos/" + person.getPhotoId());
            
            if (Boolean.TRUE.equals(person.getIsMountPoint())) {
                personJson.put("isMountPoint", true);
                if (person.getTargetPublicationId() != null) {
                    Map<String, Object> target = new LinkedHashMap<>();
                    target.put("publicationId", person.getTargetPublicationId());
                    publicationRepository.findById(person.getTargetPublicationId())
                        .ifPresent(tp -> target.put("publicationTitle", tp.getTitle()));
                    if (person.getTargetRootPersonId() != null) {
                        target.put("rootPersonId", person.getTargetRootPersonId());
                    }
                    personJson.put("mountPointTarget", target);
                    
                    // Recursive load
                    String nextPrefix = idPrefix + "branch_" + person.getTargetPublicationId() + "_";
                    loadRecursive(person.getTargetPublicationId(), person.getTargetRootPersonId(), currentDepth + 1, maxDepth, nextPrefix, allPeople, allFamilies);
                }
            }
            allPeople.put(federatedId, personJson);
        }

        for (Family family : familyEntities) {
            String federatedFamilyId = idPrefix + family.getFamilyId();
            
            List<FamilyMember> members = familyMemberRepository.findByFamilyDbIdOrderBySortOrder(family.getId());
            List<String> adults = new ArrayList<>();
            List<String> children = new ArrayList<>();

            for (FamilyMember member : members) {
                String federatedPersonId = dbIdToFederatedId.get(member.getPersonDbId());
                if (federatedPersonId != null) {
                    if ("adult".equals(member.getRole())) adults.add(federatedPersonId);
                    else children.add(federatedPersonId);
                }
            }

            Map<String, Object> familyJson = new LinkedHashMap<>();
            familyJson.put("id", federatedFamilyId);
            familyJson.put("adults", adults);
            familyJson.put("children", children);
            if (family.getBranchMode() != null) familyJson.put("branchMode", family.getBranchMode());
            
            allFamilies.put(federatedFamilyId, familyJson);
        }
    }
}
