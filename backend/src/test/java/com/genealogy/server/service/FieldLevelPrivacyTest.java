package com.genealogy.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class FieldLevelPrivacyTest {

    private PublicationViewProjector viewProjector;
    private Map<String, Object> testData;

    @BeforeEach
    void setUp() {
        viewProjector = new PublicationViewProjector(new ObjectMapper());
        
        testData = new HashMap<>();
        Map<String, Object> publication = new HashMap<>();
        Map<String, Object> people = new HashMap<>();
        
        // Living person
        Map<String, Object> living = new HashMap<>();
        living.put("id", "p1");
        living.put("name", "Living Person");
        living.put("deceased", false);
        living.put("birth", "2000-01-01");
        living.put("note", "Secret note");
        living.put("avatarUrl", "/api/photos/101");
        people.put("p1", living);
        
        // Deceased person
        Map<String, Object> deceased = new HashMap<>();
        deceased.put("id", "p2");
        deceased.put("name", "Deceased Person");
        deceased.put("deceased", true);
        deceased.put("birth", "1900-01-01");
        deceased.put("death", "1980-01-01");
        deceased.put("note", "Public note");
        deceased.put("avatarUrl", "/api/photos/102");
        people.put("p2", deceased);
        
        publication.put("people", people);
        testData.put("publication", publication);
    }

    @Test
    void testRedaction_DatesLiving() {
        // Profile: Dates = LIVING, others = NONE
        String profile = "{\"dates\":\"LIVING\", \"note\":\"NONE\", \"photo\":\"NONE\"}";
        
        Map<String, Object> redacted = viewProjector.projectRedacted(testData, profile, null);
        Map<String, Object> people = getPeople(redacted);
        
        Map<String, Object> p1 = (Map<String, Object>) people.get("p1");
        assertNull(p1.get("birth"), "Living person's birth should be redacted");
        assertEquals("Secret note", p1.get("note"), "Living person's note should be visible");
        
        Map<String, Object> p2 = (Map<String, Object>) people.get("p2");
        assertEquals("1900-01-01", p2.get("birth"), "Deceased person's birth should be visible");
    }

    @Test
    void testRedaction_NoteAll() {
        // Profile: Note = ALL
        String profile = "{\"note\":\"ALL\"}";
        
        Map<String, Object> redacted = viewProjector.projectRedacted(testData, profile, null);
        Map<String, Object> people = getPeople(redacted);
        
        Map<String, Object> p1 = (Map<String, Object>) people.get("p1");
        assertNull(p1.get("note"), "Living person's note should be redacted (ALL rule)");
        
        Map<String, Object> p2 = (Map<String, Object>) people.get("p2");
        assertNull(p2.get("note"), "Deceased person's note should be redacted (ALL rule)");
    }

    @Test
    void testRedaction_PhotoLiving() {
        // Profile: Photo = LIVING
        String profile = "{\"photo\":\"LIVING\"}";
        
        Map<String, Object> redacted = viewProjector.projectRedacted(testData, profile, null);
        Map<String, Object> people = getPeople(redacted);
        
        Map<String, Object> p1 = (Map<String, Object>) people.get("p1");
        assertNull(p1.get("avatarUrl"), "Living person's photo should be redacted");
        
        Map<String, Object> p2 = (Map<String, Object>) people.get("p2");
        assertNotNull(p2.get("avatarUrl"), "Deceased person's photo should be visible");
    }

    @Test
    void testRedaction_DefaultProfile() {
        // Default is dates: LIVING, note: LIVING
        Map<String, Object> redacted = viewProjector.projectRedacted(testData, (String)null, null);
        Map<String, Object> people = getPeople(redacted);
        
        Map<String, Object> p1 = (Map<String, Object>) people.get("p1");
        assertNull(p1.get("birth"));
        assertNull(p1.get("note"));
        assertNotNull(p1.get("avatarUrl"));
        
        Map<String, Object> p2 = (Map<String, Object>) people.get("p2");
        assertNotNull(p2.get("birth"));
        assertNotNull(p2.get("note"));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getPeople(Map<String, Object> data) {
        return (Map<String, Object>) ((Map<String, Object>) data.get("publication")).get("people");
    }
}
