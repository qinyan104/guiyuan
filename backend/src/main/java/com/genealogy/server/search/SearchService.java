package com.genealogy.server.search;

import com.genealogy.server.model.Person;
import com.genealogy.server.model.Publication;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.repository.PublicationRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.auth.AccessSubject;
import com.genealogy.server.auth.AccessPermission;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SearchService {

    private final PublicationRepository publicationRepository;
    private final PersonRepository personRepository;
    private final UserRepository userRepository;
    private final PublicationAuthorizationService authService;

    public SearchService(PublicationRepository publicationRepository,
                         PersonRepository personRepository,
                         UserRepository userRepository,
                         PublicationAuthorizationService authService) {
        this.publicationRepository = publicationRepository;
        this.personRepository = personRepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    public SearchResult search(String query, String username) {
        // Find user
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return new SearchResult(List.of(), List.of());
        }

        // Get all publications accessible to this user
        List<Publication> userPubs = publicationRepository.findByUserIdOrderByUpdatedAtDesc(user.getId());

        List<SearchResult.PublicationHit> pubHits = new ArrayList<>();
        List<SearchResult.PersonHit> personHits = new ArrayList<>();
        String lowerQuery = query.toLowerCase();

        // Collect all accessible publication IDs
        List<Long> pubIds = userPubs.stream().map(Publication::getId).toList();

        // Match publication titles in memory (small list)
        for (Publication pub : userPubs) {
            if (pub.getTitle() != null && pub.getTitle().toLowerCase().contains(lowerQuery)) {
                pubHits.add(new SearchResult.PublicationHit(
                        pub.getId(), pub.getTitle(), pub.getSubtitle()));
            }
        }

        // Search persons via a single database query instead of N queries
        if (!pubIds.isEmpty()) {
            List<Person> matchedPersons = personRepository.searchByNameInPublications(pubIds, query);
            // Build a pubId→title map for the hit results
            java.util.Map<Long, String> pubTitleMap = userPubs.stream()
                    .collect(java.util.stream.Collectors.toMap(Publication::getId, Publication::getTitle));
            for (Person person : matchedPersons) {
                String pubTitle = pubTitleMap.getOrDefault(person.getPublicationId(), "");
                personHits.add(new SearchResult.PersonHit(
                        person.getPersonId(), person.getName(), person.getPublicationId(), pubTitle));
            }
        }

        // Sort: prefix matches first
        personHits.sort((a, b) -> {
            boolean aPrefix = a.getName().toLowerCase().startsWith(lowerQuery);
            boolean bPrefix = b.getName().toLowerCase().startsWith(lowerQuery);
            if (aPrefix != bPrefix) return aPrefix ? -1 : 1;
            return a.getName().compareToIgnoreCase(b.getName());
        });

        return new SearchResult(pubHits, personHits);
    }
}
