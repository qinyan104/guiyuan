package com.genealogy.server.service;

import com.genealogy.server.dto.PersonDTO;
import com.genealogy.server.model.Person;
import com.genealogy.server.repository.PersonRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class PublicationTreeLoader {

    private final PersonRepository personRepository;

    public PublicationTreeLoader(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    public List<PersonDTO> loadPeopleWithMounts(Long publicationId, int maxDepth) {
        return loadPeopleRecursive(publicationId, 0, maxDepth);
    }

    private List<PersonDTO> loadPeopleRecursive(Long publicationId, int currentDepth, int maxDepth) {
        if (currentDepth > maxDepth) {
            return new ArrayList<>();
        }

        List<Person> basePeople = personRepository.findByPublicationId(publicationId);
        List<PersonDTO> results = new ArrayList<>();
        
        for (Person p : basePeople) {
            results.add(mapToDTO(p));
            if (Boolean.TRUE.equals(p.getIsMountPoint()) && p.getTargetPublicationId() != null) {
                results.addAll(loadPeopleRecursive(p.getTargetPublicationId(), currentDepth + 1, maxDepth));
            }
        }
        return results;
    }
    
    private PersonDTO mapToDTO(Person p) {
        PersonDTO dto = new PersonDTO();
        dto.setPersonId(p.getPersonId());
        dto.setName(p.getName());
        dto.setGender(p.getGender());
        dto.setBirthday(p.getBirth());
        dto.setDeathday(p.getDeath());
        dto.setIsMountPoint(p.getIsMountPoint());
        dto.setTargetPublicationId(p.getTargetPublicationId());
        dto.setTargetRootPersonId(p.getTargetRootPersonId());
        return dto;
    }
}
