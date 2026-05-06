package com.genealogy.server.service;

import com.genealogy.server.dto.PersonDTO;
import com.genealogy.server.model.Person;
import com.genealogy.server.repository.PersonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

class PublicationTreeLoaderTest {

    @Mock
    private PersonRepository personRepository;
    
    private PublicationTreeLoader treeLoader;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        treeLoader = new PublicationTreeLoader(personRepository);
    }

    @Test
    void loadTreeResolvesMountPoints() {
        // Parent pub has 1 person (mount point)
        Person mountPoint = new Person();
        mountPoint.setId(1L);
        mountPoint.setPersonId("P001");
        mountPoint.setName("Mount Point");
        mountPoint.setPublicationId(10L);
        mountPoint.setIsMountPoint(true);
        mountPoint.setTargetPublicationId(20L);
        mountPoint.setTargetRootPersonId(2L);
        
        // Target pub has 1 person
        Person targetPerson = new Person();
        targetPerson.setId(2L);
        targetPerson.setPersonId("P002");
        targetPerson.setPublicationId(20L);
        targetPerson.setName("Target Branch Node");
        
        when(personRepository.findByPublicationId(10L)).thenReturn(List.of(mountPoint));
        when(personRepository.findByPublicationId(20L)).thenReturn(List.of(targetPerson));
        
        List<PersonDTO> result = treeLoader.loadPeopleWithMounts(10L, 1);
        
        assertThat(result).hasSize(2);
        assertThat(result.stream().anyMatch(p -> p.getName() != null && p.getName().equals("Target Branch Node"))).isTrue();
    }
}
