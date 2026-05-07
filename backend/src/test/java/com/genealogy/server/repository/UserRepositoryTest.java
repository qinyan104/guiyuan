package com.genealogy.server.repository;

import com.genealogy.server.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
public class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    public void testSearchUsersByUsernameOrNickname() {
        User user1 = new User();
        user1.setUsername("testuser1");
        user1.setPassword("pass");
        user1.setNickname("Alice");
        userRepository.save(user1);

        User user2 = new User();
        user2.setUsername("bobsmith");
        user2.setPassword("pass");
        user2.setNickname("Bobby");
        userRepository.save(user2);

        // Search by username (case insensitive)
        List<User> results = userRepository.findByUsernameContainingIgnoreCaseOrNicknameContainingIgnoreCase("TEST", "TEST");
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getUsername()).isEqualTo("testuser1");

        // Search by nickname (case insensitive)
        results = userRepository.findByUsernameContainingIgnoreCaseOrNicknameContainingIgnoreCase("ALICE", "ALICE");
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getNickname()).isEqualTo("Alice");

        // Search by part of both
        results = userRepository.findByUsernameContainingIgnoreCaseOrNicknameContainingIgnoreCase("O", "O");
        assertThat(results).hasSize(2); // bOb, bObby
    }
}
