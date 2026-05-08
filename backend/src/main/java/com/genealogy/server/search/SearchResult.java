package com.genealogy.server.search;

import java.util.List;

public class SearchResult {
    private List<PublicationHit> publications;
    private List<PersonHit> persons;

    public SearchResult(List<PublicationHit> publications, List<PersonHit> persons) {
        this.publications = publications;
        this.persons = persons;
    }

    public List<PublicationHit> getPublications() { return publications; }
    public List<PersonHit> getPersons() { return persons; }

    public static class PublicationHit {
        private Long id;
        private String title;
        private String subtitle;

        public PublicationHit(Long id, String title, String subtitle) {
            this.id = id; this.title = title; this.subtitle = subtitle;
        }

        public Long getId() { return id; }
        public String getTitle() { return title; }
        public String getSubtitle() { return subtitle; }
    }

    public static class PersonHit {
        private String personId;
        private String name;
        private Long publicationId;
        private String publicationTitle;

        public PersonHit(String personId, String name, Long publicationId, String publicationTitle) {
            this.personId = personId; this.name = name;
            this.publicationId = publicationId; this.publicationTitle = publicationTitle;
        }

        public String getPersonId() { return personId; }
        public String getName() { return name; }
        public Long getPublicationId() { return publicationId; }
        public String getPublicationTitle() { return publicationTitle; }
    }
}
