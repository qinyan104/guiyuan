package com.genealogy.server.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

class LocalEnvConfigImportTest {

    @Test
    void applicationYmlImportsLocalEnvFilesForDevelopmentStartup() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application.yml"));

        Properties properties = yaml.getObject();

        assertThat(properties)
                .containsEntry("spring.config.import[0]", "optional:file:.env.local[.properties]")
                .containsEntry("spring.config.import[1]", "optional:file:backend/.env.local[.properties]");
    }

    @Test
    void applicationPropertiesImportsLocalEnvFilesForDevelopmentStartup() throws IOException {
        Properties properties = new Properties();
        properties.load(new ClassPathResource("application.properties").getInputStream());

        assertThat(properties)
                .containsEntry("spring.config.import",
                        "optional:file:.env.local[.properties],optional:file:backend/.env.local[.properties]");
    }
}
