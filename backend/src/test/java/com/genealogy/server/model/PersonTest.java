package com.genealogy.server.model;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class PersonTest {

    @Test
    void testMountPointProperties() {
        Person person = new Person();
        
        person.setIsMountPoint(true);
        person.setTargetPublicationId(100L);
        person.setTargetRootPersonId(500L);
        
        assertThat(person.getIsMountPoint()).isTrue();
        assertThat(person.getTargetPublicationId()).isEqualTo(100L);
        assertThat(person.getTargetRootPersonId()).isEqualTo(500L);
    }
}
