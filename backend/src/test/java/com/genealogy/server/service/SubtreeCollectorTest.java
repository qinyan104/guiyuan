package com.genealogy.server.service;

import com.genealogy.server.model.FamilyMember;
import com.genealogy.server.repository.FamilyMemberRepository;
import com.genealogy.server.repository.FamilyRepository;
import com.genealogy.server.repository.PersonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubtreeCollectorTest {

    @Mock
    private PersonRepository personRepository;
    @Mock
    private FamilyRepository familyRepository;
    @Mock
    private FamilyMemberRepository familyMemberRepository;

    private PublicationService publicationService;

    @BeforeEach
    void setUp() {
        // We only need the repositories used by collectSubtreeIds
        publicationService = new PublicationService(
                null, personRepository, familyRepository, familyMemberRepository,
                null, null, null, null, null, null, null
        );
    }

    @Test
    void shouldCollectOnlySubtree() {
        // Setup:
        // P1 -> F1 (P1, P2 adults)
        // F1 -> P3 (child)
        // P3 -> F2 (P3, P4 adults)
        // F2 -> P5 (child)
        
        // Root: P3
        // Expected: P3, P4, P5 and F2
        
        Long p3DbId = 3L;
        Long p4DbId = 4L;
        Long p5DbId = 5L;
        Long f2DbId = 20L;

        FamilyMember m3f2 = new FamilyMember(); m3f2.setPersonDbId(p3DbId); m3f2.setFamilyDbId(f2DbId); m3f2.setRole("adult");
        FamilyMember m4f2 = new FamilyMember(); m4f2.setPersonDbId(p4DbId); m4f2.setFamilyDbId(f2DbId); m4f2.setRole("adult");
        FamilyMember m5f2 = new FamilyMember(); m5f2.setPersonDbId(p5DbId); m5f2.setFamilyDbId(f2DbId); m5f2.setRole("child");

        when(familyMemberRepository.findByPersonDbId(p3DbId)).thenReturn(Collections.singletonList(m3f2));
        when(familyMemberRepository.findByFamilyDbIdOrderBySortOrder(f2DbId)).thenReturn(Arrays.asList(m3f2, m4f2, m5f2));
        
        // P4 has no other families
        when(familyMemberRepository.findByPersonDbId(p4DbId)).thenReturn(Collections.singletonList(m4f2));
        // P5 has no other families
        when(familyMemberRepository.findByPersonDbId(p5DbId)).thenReturn(Collections.singletonList(m5f2));

        PublicationService.SubtreeResult result = publicationService.collectSubtreeIds(p3DbId);

        assertThat(result.getPersonDbIds()).containsExactlyInAnyOrder(p3DbId, p4DbId, p5DbId);
        assertThat(result.getFamilyDbIds()).containsExactlyInAnyOrder(f2DbId);
    }
}
