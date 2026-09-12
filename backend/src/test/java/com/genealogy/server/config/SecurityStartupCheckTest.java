package com.genealogy.server.config;

import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SecurityStartupCheckTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    @Mock
    private Environment environment;

    @Test
    void productionRejectsDefaultRootPassword() {
        User root = new User();
        root.setUsername("root");
        root.setPassword("$2a$10$rLyRkUay/Y2VJzRj6tJUEu7R.b8dOXFnUNlp5PuGsqZVeaSqRIhAW");
        when(userRepository.findByUsername("root")).thenReturn(Optional.of(root));
        when(environment.getActiveProfiles()).thenReturn(new String[]{"production"});

        SecurityStartupCheck check = new SecurityStartupCheck(userRepository, passwordEncoder, environment);

        assertThatThrownBy(check::run)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("INITIAL_ADMIN_PASSWORD");
    }

    @Test
    void productionReplacesDefaultRootPasswordWithConfiguredStrongPassword() {
        User root = new User();
        root.setUsername("root");
        root.setPassword("$2a$10$rLyRkUay/Y2VJzRj6tJUEu7R.b8dOXFnUNlp5PuGsqZVeaSqRIhAW");
        when(userRepository.findByUsername("root")).thenReturn(Optional.of(root));
        when(environment.getActiveProfiles()).thenReturn(new String[]{"production"});
        when(passwordEncoder.encode("StrongAdmin123")).thenReturn("encoded");

        SecurityStartupCheck check = new SecurityStartupCheck(userRepository, passwordEncoder, environment);
        ReflectionTestUtils.setField(check, "initialAdminPassword", "StrongAdmin123");

        assertThatCode(check::run).doesNotThrowAnyException();
        assertThat(root.getPassword()).isEqualTo("encoded");
    }

    @Test
    void productionRejectsWeakConfiguredInitialPassword() {
        User root = new User();
        root.setUsername("root");
        root.setPassword("$2a$10$rLyRkUay/Y2VJzRj6tJUEu7R.b8dOXFnUNlp5PuGsqZVeaSqRIhAW");
        when(userRepository.findByUsername("root")).thenReturn(Optional.of(root));
        when(environment.getActiveProfiles()).thenReturn(new String[]{"production"});

        SecurityStartupCheck check = new SecurityStartupCheck(userRepository, passwordEncoder, environment);
        ReflectionTestUtils.setField(check, "initialAdminPassword", "replace-with-a-strong-initial-admin-password");

        assertThatThrownBy(check::run)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("INITIAL_ADMIN_PASSWORD");
    }

    @Test
    void nonProductionAllowsDefaultRootPasswordWithWarningOnly() {
        User root = new User();
        root.setUsername("root");
        root.setPassword("$2a$10$rLyRkUay/Y2VJzRj6tJUEu7R.b8dOXFnUNlp5PuGsqZVeaSqRIhAW");
        when(userRepository.findByUsername("root")).thenReturn(Optional.of(root));

        SecurityStartupCheck check = new SecurityStartupCheck(userRepository, passwordEncoder, environment);

        assertThatCode(check::run).doesNotThrowAnyException();
    }
}
