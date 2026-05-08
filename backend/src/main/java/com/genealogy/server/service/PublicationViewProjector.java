package com.genealogy.server.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.auth.ShareSubject;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PublicationViewProjector {

    private static final Pattern PHOTO_URL_PATTERN = Pattern.compile("/api/photos/(\\d+)");
    static final Map<String, Object> DEFAULT_REDACTION_PROFILE = Map.of(
            "hideLivingSensitive", true,
            "hideContactInfo", true,
            "photoProxy", true,
            "maxExportDepth", 2
    );

    private final ObjectMapper objectMapper;

    public PublicationViewProjector(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Apply redaction rules to a full publication data map.
     * Returns a new map (does not mutate the original).
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> projectRedacted(Map<String, Object> fullData, ShareSubject subject, String token) {
        Map<String, Object> profile = parseProfile(subject.getRedactionProfileJson());
        boolean hideLivingSensitive = (Boolean) profile.getOrDefault("hideLivingSensitive", true);
        boolean photoProxy = (Boolean) profile.getOrDefault("photoProxy", true);

        Map<String, Object> result = new LinkedHashMap<>(fullData);
        Map<String, Object> publication = new LinkedHashMap<>((Map<String, Object>) fullData.get("publication"));

        if (hideLivingSensitive || photoProxy) {
            Map<String, Object> people = (Map<String, Object>) publication.get("people");
            if (people != null) {
                Map<String, Object> redactedPeople = new LinkedHashMap<>();
                for (Map.Entry<String, Object> entry : people.entrySet()) {
                    Map<String, Object> person = new LinkedHashMap<>((Map<String, Object>) entry.getValue());
                    if (hideLivingSensitive) {
                        redactLivingSensitive(person);
                    }
                    if (photoProxy) {
                        proxyPhotoUrl(person, token);
                    }
                    redactedPeople.put(entry.getKey(), person);
                }
                publication.put("people", redactedPeople);
            }
        }

        result.put("publication", publication);
        return result;
    }

    private void redactLivingSensitive(Map<String, Object> person) {
        Object deceased = person.get("deceased");
        boolean isDeceased = Boolean.TRUE.equals(deceased);
        if (!isDeceased) {
            person.put("birth", null);
            person.put("death", null);
            person.put("age", null);
            person.put("note", null);
        }
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
