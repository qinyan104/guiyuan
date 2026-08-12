package com.genealogy.server.config;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;

class FlywayMigrationConfigurationTest {

    @Test
    void repairEnabled_repairsBeforeMigrating() {
        Flyway flyway = mock(Flyway.class);
        FlywayMigrationStrategy strategy = new FlywayMigrationConfiguration()
                .flywayMigrationStrategy(true);

        strategy.migrate(flyway);

        var order = inOrder(flyway);
        order.verify(flyway).repair();
        order.verify(flyway).migrate();
    }

    @Test
    void repairDisabled_onlyMigrates() {
        Flyway flyway = mock(Flyway.class);
        FlywayMigrationStrategy strategy = new FlywayMigrationConfiguration()
                .flywayMigrationStrategy(false);

        strategy.migrate(flyway);

        var order = inOrder(flyway);
        order.verify(flyway).migrate();
        order.verifyNoMoreInteractions();
    }
}
