package com.genealogy.server.config;

import com.genealogy.server.service.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataMigrationRunner implements CommandLineRunner {

    private final UserService userService;

    public DataMigrationRunner(UserService userService) {
        this.userService = userService;
    }

    @Override
    public void run(String... args) {
        userService.migrateExistingUsers();
    }
}
