package com.genealogy.server.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.auth.ShareSubject;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PublicationViewProjector {

    private static final Pattern PHOTO_URL_PATTERN = Pattern.compile("/api/photos/(\\d+)");
    
    static final Map<String, Object> DEFAULT_REDACTION_PROFILE = Map.of(
            "dates", "LIVING",
            "note", "LIVING",
            "photo", "NONE",
            "photoProxy", true,
            "hideContactInfo", true,
            "maxExportDepth", 2
    );

    private final ObjectMapper objectMapper;

    public PublicationViewProjector(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Entry point for Share links.
     */
    public Map<String, Object> projectRedacted(Map<String, Object> fullData, ShareSubject subject, String token) {
        return projectRedacted(fullData, subject.getRedactionProfileJson(), token);
    }

    /**
     * General entry point for both share links and authorized collaborators.
     * @param fullData The full publication data map.
     * @param profileJson Redaction profile JSON string.
     * @param token Optional share token. If present, photo URLs will be proxied.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> projectRedacted(Map<String, Object> fullData, String profileJson, String token) {
        Map<String, Object> profile = parseProfile(profileJson);
        
        // Granular rules: NONE, LIVING, ALL
        String datesRule = getRule(profile, "dates", "hideLivingSensitive", "LIVING");
        String noteRule = getRule(profile, "note", "hideLivingSensitive", "LIVING");
        String photoRule = getRule(profile, "photo", null, "NONE");
        
        boolean photoProxy = (Boolean) profile.getOrDefault("photoProxy", true);

        Map<String, Object> result = new LinkedHashMap<>(fullData);
        Map<String, Object> publication = new LinkedHashMap<>((Map<String, Object>) fullData.get("publication"));

        Map<String, Object> people = (Map<String, Object>) publication.get("people");
        if (people != null) {
            Map<String, Object> redactedPeople = new LinkedHashMap<>();
            for (Map.Entry<String, Object> entry : people.entrySet()) {
                Map<String, Object> person = new LinkedHashMap<>((Map<String, Object>) entry.getValue());
                
                redactLivingSensitive(person, datesRule, noteRule, photoRule);
                
                if (token != null && photoProxy) {
                    proxyPhotoUrl(person, token);
                }
                
                redactedPeople.put(entry.getKey(), person);
            }
            publication.put("people", redactedPeople);
        }

        result.put("publication", publication);
        return result;
    }

    private String getRule(Map<String, Object> profile, String key, String legacyKey, String defaultValue) {
        Object val = profile.get(key);
        if (val instanceof String s) return s;
        
        if (legacyKey != null) {
            Object legacyVal = profile.get(legacyKey);
            if (legacyVal instanceof Boolean b) {
                return b ? "LIVING" : "NONE";
            }
        }
        
        return defaultValue;
    }

    private void redactLivingSensitive(Map<String, Object> person, String datesRule, String noteRule, String photoRule) {
        Object deceased = person.get("deceased");
        boolean isDeceased = Boolean.TRUE.equals(deceased);

        if (shouldRedact(datesRule, isDeceased)) {
            person.put("birth", null);
            person.put("death", null);
            person.put("age", null);
        }

        if (shouldRedact(noteRule, isDeceased)) {
            person.put("note", null);
        }

        if (shouldRedact(photoRule, isDeceased)) {
            person.put("photoId", null);
            person.put("avatarUrl", null);
            person.put("photoBase64", null);
        }
    }

    private boolean shouldRedact(String rule, boolean isDeceased) {
        if ("ALL".equals(rule)) return true;
        if ("LIVING".equals(rule)) return !isDeceased;
        return false; // NONE or default
    }

    private void proxyPhotoUrl(Map<String, Object> person, String token) {
        Object avatarUrl = person.get("avatarUrl");
        if (avatarUrl instanceof String url) {
            Matcher matcher = PHOTO_URL_PATTERN.matcher(url);
            if (matcher.find()) {
                String photoId = matcher.group(1);
                person.put("avatarUrl", "/api/shares/" + token + "/photos/" + photoId);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseProfile(String json) {
        if (json == null || json.isBlank()) {
            return DEFAULT_REDACTION_PROFILE;
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return DEFAULT_REDACTION_PROFILE;
        }
    }
}
