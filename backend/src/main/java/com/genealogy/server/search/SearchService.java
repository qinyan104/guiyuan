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

        for (Publication pub : userPubs) {
            // Match publication title
            if (pub.getTitle() != null && pub.getTitle().toLowerCase().contains(lowerQuery)) {
                pubHits.add(new SearchResult.PublicationHit(
                        pub.getId(), pub.getTitle(), pub.getSubtitle()));
            }

            // Search persons within this publication
            List<Person> persons = personRepository.findByPublicationId(pub.getId());
            for (Person person : persons) {
                if (person.getName() != null && person.getName().toLowerCase().contains(lowerQuery)) {
                    personHits.add(new SearchResult.PersonHit(
                            person.getPersonId(), person.getName(), pub.getId(), pub.getTitle()));
                }
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
