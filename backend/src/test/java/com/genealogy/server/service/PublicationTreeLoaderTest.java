package com.genealogy.server.service;

import com.genealogy.server.model.Person;
import com.genealogy.server.repository.FamilyMemberRepository;
import com.genealogy.server.repository.FamilyRepository;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PublicationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicationTreeLoaderTest {

    @Mock
    private PersonRepository personRepository;
    @Mock
    private FamilyRepository familyRepository;
    @Mock
    private FamilyMemberRepository familyMemberRepository;
    @Mock
    private PublicationRepository publicationRepository;
    @Mock
    private PublicationService publicationService;
    
    private PublicationTreeLoader treeLoader;

    @BeforeEach
    void setUp() {
        treeLoader = new PublicationTreeLoader(personRepository, familyRepository, familyMemberRepository, publicationRepository, publicationService);
    }

    @Test
    void loadFederatedDataResolvesMountPointsRecursively() {
        // Parent pub has 1 person (mount point)
        Person mountPoint = new Person();
        mountPoint.setId(1L);
        mountPoint.setPersonId("P001");
        mountPoint.setName("Mount Point");
        mountPoint.setPublicationId(10L);
        mountPoint.setIsMountPoint(true);
        mountPoint.setTargetPublicationId(20L);
        
        // Target pub has 1 person
        Person targetPerson = new Person();
        targetPerson.setId(2L);
        targetPerson.setPersonId("P002");
        targetPerson.setPublicationId(20L);
        targetPerson.setName("Target Branch Node");
        
        when(personRepository.findByPublicationId(10L)).thenReturn(List.of(mountPoint));
        when(personRepository.findByPublicationId(20L)).thenReturn(List.of(targetPerson));
        when(familyRepository.findByPublicationId(10L)).thenReturn(List.of());
        when(familyRepository.findByPublicationId(20L)).thenReturn(List.of());
        
        Map<String, Map<String, Object>> people = new HashMap<>();
        Map<String, Map<String, Object>> families = new HashMap<>();
        
        treeLoader.loadFederatedData(10L, 1, "", people, families);
        
        assertThat(people).hasSize(2);
        assertThat(people.containsKey("P001")).isTrue();
        assertThat(people.containsKey("branch_20_P002")).isTrue();
        assertThat(people.get("branch_20_P002").get("name")).isEqualTo("Target Branch Node");
    }
}
