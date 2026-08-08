package com.genealogy.server.config;

import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class SecurityStartupCheck implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SecurityStartupCheck.class);
    private static final String DEFAULT_ADMIN_PASSWORD_HASH =
            "$2a$10$rLyRkUay/Y2VJzRj6tJUEu7R.b8dOXFnUNlp5PuGsqZVeaSqRIhAW";

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final Environment environment;

    public SecurityStartupCheck(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder, Environment environment) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
    }

    @Override
    public void run(String... args) {
        checkDefaultAdminPassword();
    }

    private void checkDefaultAdminPassword() {
        userRepository.findByUsername("root").ifPresent(admin -> {
            if (isDefaultAdminPassword(admin)) {
                if (isProductionProfile()) {
                    throw new IllegalStateException(
                            "Production startup blocked: default admin account 'root' still uses password 123456.");
                }
                log.warn("===========================================================");
                log.warn("  SECURITY WARNING: Default admin account 'root' is using");
                log.warn("  the factory password (123456). Change it immediately via");
                log.warn("  the admin panel or reset-password API.");
                log.warn("===========================================================");
            }
        });
    }

    private boolean isDefaultAdminPassword(User admin) {
        String password = admin.getPassword();
        return DEFAULT_ADMIN_PASSWORD_HASH.equals(password) || passwordEncoder.matches("123456", password);
    }

    private boolean isProductionProfile() {
        String[] activeProfiles = environment.getActiveProfiles();
        if (activeProfiles == null) {
            return false;
        }
        return Arrays.stream(activeProfiles)
                .anyMatch(profile -> profile.equalsIgnoreCase("production") || profile.equalsIgnoreCase("prod"));
    }
}
