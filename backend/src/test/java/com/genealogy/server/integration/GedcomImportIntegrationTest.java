package com.genealogy.server.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.gedcom.GedcomExportService;
import com.genealogy.server.gedcom.GedcomImportService;
import com.genealogy.server.gedcom.GedcomParser;
import com.genealogy.server.service.PublicationService;
import com.genealogy.server.types.PublicationData;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class GedcomImportIntegrationTest {
    @Autowired private GedcomImportService imports;
    @Autowired private GedcomExportService exports;
    @Autowired private PublicationService publications;
    @Autowired private ObjectMapper objectMapper;

    private Long publicationId;

    @AfterEach
    void cleanup() {
        if (publicationId != null) publications.deletePublication(publicationId);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    @SuppressWarnings("unchecked")
    void importMergeEditSaveReloadAndExportPreserveBothFamilies(boolean referencesOnly) throws Exception {
        publicationId = imports.importAsNewPublication(gedcom("张", false), 1L).pubId();
        Map<String, Object> before = publications.loadPublication(publicationId);
        Map<String, Object> original = (Map<String, Object>) before.get("publication");
        assertThat(original.get("subtitle")).isEqualTo("");

        // Both files use @I1@..@I3@ and @F1@, but describe unrelated families.
        var merged = imports.mergeIntoPublication(gedcom("李", referencesOnly), publicationId);
        assertThat(merged.personCount()).isEqualTo(3);
        assertThat(merged.familyCount()).isEqualTo(1);

        Map<String, Object> loaded = publications.loadPublication(publicationId);
        Map<String, Object> publication = (Map<String, Object>) loaded.get("publication");
        Map<String, Object> people = (Map<String, Object>) publication.get("people");
        Map<String, Object> families = (Map<String, Object>) publication.get("families");
        assertThat(people).hasSize(6).containsAllEntriesOf((Map<String, Object>) original.get("people"));
        assertThat(families).hasSize(2).containsAllEntriesOf((Map<String, Object>) original.get("families"));
        assertThat(publication.get("focusFamilyId")).isEqualTo(original.get("focusFamilyId"));
        assertFamily(publication, "张");
        assertFamily(publication, "李");

        Map<String, Object> person = people.values().stream()
                .map(value -> (Map<String, Object>) value)
                .filter(value -> "李父".equals(value.get("name")))
                .findFirst().orElseThrow();
        person.put("note", "校对后补充的生平");
        publications.updatePublication(publicationId, (Long) loaded.get("revision"),
                (String) publication.get("title"), (String) publication.get("subtitle"), publication,
                objectMapper.writeValueAsString(loaded.get("settings")),
                objectMapper.writeValueAsString(publication.get("info")));

        Map<String, Object> reopened = publications.loadPublication(publicationId);
        assertThat(reopened.get("publication")).isEqualTo(publication);
        assertThat(reopened.get("settings")).isEqualTo(loaded.get("settings"));

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        exports.export(publicationId, output);
        var parsed = new GedcomParser().parse(new ByteArrayInputStream(output.toByteArray()));
        assertThat(parsed.persons()).hasSize(6);
        assertThat(parsed.families()).hasSize(2);
        assertThat(parsed.persons()).anySatisfy(value -> {
            assertThat(value.name()).isEqualTo("李父");
            assertThat(value.note()).isEqualTo("校对后补充的生平");
        });
        for (var family : parsed.families()) {
            String surname = parsed.persons().stream()
                    .filter(value -> value.id().equals(family.husbandId()))
                    .findFirst().orElseThrow().name().substring(0, 1);
            assertThat(parsed.persons()).anySatisfy(value -> {
                assertThat(value.id()).isEqualTo(family.wifeId());
                assertThat(value.name()).isEqualTo(surname + "母");
            });
            assertThat(family.childrenIds()).hasSize(1);
            assertThat(parsed.persons()).anySatisfy(value -> {
                assertThat(value.id()).isEqualTo(family.childrenIds().get(0));
                assertThat(value.name()).isEqualTo(surname + "子");
            });
        }
    }

    private void assertFamily(Map<String, Object> data, String surname) {
        PublicationData publication = PublicationData.fromMap(data);
        assertThat(publication.families().values()).anySatisfy(family -> {
            assertThat(family.adults().stream().map(id -> publication.people().get(id).name()).toList())
                    .isEqualTo(List.of(surname + "父", surname + "母"));
            assertThat(family.children().stream().map(id -> publication.people().get(id).name()).toList())
                    .isEqualTo(List.of(surname + "子"));
        });
    }

    private ByteArrayInputStream gedcom(String surname, boolean referencesOnly) {
        String text = """
                0 HEAD
                1 CHAR UTF-8
                0 @I1@ INDI
                1 NAME %s父
                1 SEX M
                1 FAMS @F1@
                0 @I2@ INDI
                1 NAME %s母
                1 SEX F
                1 FAMS @F1@
                0 @I3@ INDI
                1 NAME %s子
                1 SEX M
                1 FAMC @F1@
                """.formatted(surname, surname, surname);
        if (!referencesOnly) {
            text += "0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 CHIL @I3@\n";
        }
        return new ByteArrayInputStream((text + "0 TRLR\n").getBytes(StandardCharsets.UTF_8));
    }
}
