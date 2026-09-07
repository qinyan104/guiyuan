package com.genealogy.server.performance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.model.Family;
import com.genealogy.server.model.FamilyMember;
import com.genealogy.server.model.Person;
import com.genealogy.server.model.Publication;
import com.genealogy.server.repository.FamilyMemberRepository;
import com.genealogy.server.repository.FamilyRepository;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PublicationRepository;
import com.genealogy.server.service.BranchMergeService;
import com.genealogy.server.service.PublicationService;
import com.genealogy.server.service.PublicationTreeLoader;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.PersistenceContext;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Explicit performance probe. It is intentionally named Probe, so normal Maven test runs do not execute it.
 * Run with: .\\mvnw.cmd -Dtest=PublicationLoadPerformanceProbe test -Dperf.people=1000
 */
@SpringBootTest
@ActiveProfiles("test")
class PublicationLoadPerformanceProbe {

    @Autowired
    private PublicationRepository publicationRepository;
    @Autowired
    private PersonRepository personRepository;
    @Autowired
    private FamilyRepository familyRepository;
    @Autowired
    private FamilyMemberRepository familyMemberRepository;
    @Autowired
    private PublicationTreeLoader treeLoader;
    @Autowired
    private BranchMergeService branchMergeService;
    @Autowired
    private PublicationService publicationService;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private EntityManagerFactory entityManagerFactory;
    @PersistenceContext
    private EntityManager entityManager;

    @Test
    void measurePublicationOpenStages() throws Exception {
        int requestedPeople = Integer.getInteger("perf.people", 1000);
        assertThat(requestedPeople).isBetween(2, 10000);

        Fixture fixture = seedFixture(requestedPeople);
        entityManager.clear();

        SessionFactory sessionFactory = entityManagerFactory.unwrap(SessionFactory.class);
        Statistics statistics = sessionFactory.getStatistics();
        statistics.setStatisticsEnabled(true);

        System.out.printf("[PERF] dataset requestedPeople=%d masterPeople=%d branchPeople=%d%n",
                requestedPeople, fixture.masterPeople, fixture.branchPeople);

        statistics.clear();
        measure("publication metadata", statistics, () -> publicationRepository.findById(fixture.masterPublicationId).orElseThrow());

        entityManager.clear();
        statistics.clear();
        long subtreeStart = System.nanoTime();
        BranchMergeService.SubtreeResult subtree = branchMergeService.collectSubtreeIds(fixture.branchRootPersonId);
        printMeasurement("branch subtree expansion", elapsedMillis(subtreeStart), statistics,
                subtree.personDbIds().size(), subtree.familyDbIds().size(), 0);

        entityManager.clear();
        statistics.clear();
        Map<String, Map<String, Object>> people = new LinkedHashMap<>();
        Map<String, Map<String, Object>> families = new LinkedHashMap<>();
        long treeStart = System.nanoTime();
        treeLoader.loadFederatedData(fixture.masterPublicationId, 3, "", people, families);
        printMeasurement("tree loading", elapsedMillis(treeStart), statistics, people.size(), families.size(), 0);
        assertThat(people).isNotEmpty();
        assertThat(families).isNotEmpty();

        entityManager.clear();
        statistics.clear();
        long fullStart = System.nanoTime();
        Map<String, Object> response = publicationService.loadPublication(fixture.masterPublicationId);
        long loadMillis = elapsedMillis(fullStart);
        long serializationStart = System.nanoTime();
        int responseBytes = objectMapper.writeValueAsBytes(response).length;
        long serializationMillis = elapsedMillis(serializationStart);
        printMeasurement("full loadPublication", loadMillis, statistics, responsePeople(response), responseFamilies(response), responseBytes);
        System.out.printf("[PERF] stage=response serialization ms=%d bytes=%d%n", serializationMillis, responseBytes);

        assertThat(response).containsKeys("publication", "settings");
    }

    private void measure(String stage, Statistics statistics, Runnable action) {
        long start = System.nanoTime();
        action.run();
        printMeasurement(stage, elapsedMillis(start), statistics, 0, 0, 0);
    }

    private void printMeasurement(String stage, long millis, Statistics statistics,
                                  int people, int families, int responseBytes) {
        System.out.printf("[PERF] stage=%s ms=%d sqlStatements=%d hqlQueries=%d entities=%d people=%d families=%d responseBytes=%d%n",
                stage, millis, statistics.getPrepareStatementCount(), statistics.getQueryExecutionCount(), statistics.getEntityLoadCount(),
                people, families, responseBytes);
    }

    private long elapsedMillis(long start) {
        return (System.nanoTime() - start) / 1_000_000;
    }

    @SuppressWarnings("unchecked")
    private int responsePeople(Map<String, Object> response) {
        Map<String, Object> publication = (Map<String, Object>) response.get("publication");
        return ((Map<String, Object>) publication.get("people")).size();
    }

    @SuppressWarnings("unchecked")
    private int responseFamilies(Map<String, Object> response) {
        Map<String, Object> publication = (Map<String, Object>) response.get("publication");
        return ((Map<String, Object>) publication.get("families")).size();
    }

    private Fixture seedFixture(int requestedPeople) {
        int branchPeople = Math.max(2, requestedPeople / 4);
        Publication branch = savePublication("perf-branch");
        List<Person> branchPersons = savePersons(branch.getId(), "b", branchPeople, false, null, null);
        createBranchingFamilies(branch.getId(), "bf", branchPersons);

        Publication master = savePublication("perf-master");
        List<Person> masterPersons = savePersons(master.getId(), "m", requestedPeople, true,
                branch.getId(), branchPersons.get(0).getId());
        master.setFocusFamilyId("mf0");
        publicationRepository.saveAndFlush(master);
        createBranchingFamilies(master.getId(), "mf", masterPersons);
        return new Fixture(master.getId(), requestedPeople, branchPeople, branchPersons.get(0).getId());
    }

    private Publication savePublication(String title) {
        Publication publication = new Publication();
        publication.setUserId(1L);
        publication.setTitle(title);
        publication.setSubtitle("");
        publication.setSettingsJson("{}");
        publication.setPublicationInfoJson("{}");
        return publicationRepository.saveAndFlush(publication);
    }

    private List<Person> savePersons(Long publicationId, String prefix, int count,
                                     boolean mountFirst, Long branchPublicationId, Long branchRootId) {
        List<Person> persons = new ArrayList<>(count);
        for (int index = 0; index < count; index++) {
            Person person = new Person();
            person.setPublicationId(publicationId);
            person.setPersonId(prefix + index);
            person.setName("Person " + prefix + index);
            person.setGender(index % 2 == 0 ? "male" : "female");
            if (mountFirst && index == 0) {
                person.setIsMountPoint(true);
                person.setTargetPublicationId(branchPublicationId);
                person.setTargetRootPersonId(branchRootId);
            }
            persons.add(person);
        }
        return personRepository.saveAllAndFlush(persons);
    }

    private void createBranchingFamilies(Long publicationId, String prefix, List<Person> persons) {
        List<Family> families = new ArrayList<>();
        for (int index = 0; index < persons.size(); index++) {
            if (index * 2 + 1 >= persons.size()) {
                break;
            }
            Family family = new Family();
            family.setPublicationId(publicationId);
            family.setFamilyId(prefix + index);
            families.add(family);
        }
        families = familyRepository.saveAllAndFlush(families);

        List<FamilyMember> members = new ArrayList<>(families.size() * 3);
        for (int index = 0; index < families.size(); index++) {
            Family family = families.get(index);
            FamilyMember adult = new FamilyMember();
            adult.setFamilyDbId(family.getId());
            adult.setPersonDbId(persons.get(index).getId());
            adult.setRole("adult");
            adult.setSortOrder(0);
            members.add(adult);

            for (int childIndex = index * 2 + 1; childIndex <= index * 2 + 2 && childIndex < persons.size(); childIndex++) {
                FamilyMember child = new FamilyMember();
                child.setFamilyDbId(family.getId());
                child.setPersonDbId(persons.get(childIndex).getId());
                child.setRole("child");
                child.setSortOrder(childIndex - index * 2 - 1);
                members.add(child);
            }
        }
        familyMemberRepository.saveAllAndFlush(members);
    }

    private record Fixture(Long masterPublicationId, int masterPeople, int branchPeople, Long branchRootPersonId) {}
}
