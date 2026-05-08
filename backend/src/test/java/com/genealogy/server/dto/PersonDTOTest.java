package com.genealogy.server.dto;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class PersonDTOTest {
    @Test
    void testMountPointFields() {
        PersonDTO dto = new PersonDTO();
        dto.setIsMountPoint(true);
        dto.setTargetPublicationId(200L);
        dto.setTargetRootPersonId(600L);
        
        assertThat(dto.getIsMountPoint()).isTrue();
        assertThat(dto.getTargetPublicationId()).isEqualTo(200L);
        assertThat(dto.getTargetRootPersonId()).isEqualTo(600L);
    }
}
