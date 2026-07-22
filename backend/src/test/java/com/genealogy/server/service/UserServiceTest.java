package com.genealogy.server.service;

import com.genealogy.server.dto.LoginRequest;
import com.genealogy.server.dto.RegisterRequest;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.PersonAccountRepository;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.util.HashUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private BCryptPasswordEncoder passwordEncoder;
    @Mock private PersonAccountRepository personAccountRepository;
    @Mock private PublicationAccessRepository publicationAccessRepository;
    @InjectMocks private UserService userService;

    // ---- Helper ----
    private User makeUser(Long id, String username, String role) {
        User u = new User();
        u.setId(id);
        u.setUsername(username);
        u.setPassword("encodedPwd");
        u.setNickname(username);
        u.setRole(role);
        return u;
    }

    // ==================== listAllUsers ====================

    @Test
    void listAllUsers_returnsAllUsers() {
        List<User> users = Arrays.asList(
                makeUser(1L, "alice", "SUPER_ADMIN"),
                makeUser(2L, "bob", "USER"));
        when(userRepository.findAll()).thenReturn(users);

        List<User> result = userService.listAllUsers();

        assertEquals(2, result.size());
        assertEquals("alice", result.get(0).getUsername());
        verify(userRepository).findAll();
    }

    @Test
    void listAllUsers_emptyList() {
        when(userRepository.findAll()).thenReturn(Collections.emptyList());

        List<User> result = userService.listAllUsers();

        assertTrue(result.isEmpty());
    }

    // ==================== findById ====================

    @Test
    void findById_existingUser_returnsOptional() {
        User user = makeUser(1L, "alice", "USER");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        Optional<User> result = userService.findById(1L);

        assertTrue(result.isPresent());
        assertEquals("alice", result.get().getUsername());
    }

    @Test
    void findById_nonExisting_returnsEmpty() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        Optional<User> result = userService.findById(99L);

        assertTrue(result.isEmpty());
    }

    // ==================== findByUsername ====================

    @Test
    void findByUsername_existing_returnsOptional() {
        User user = makeUser(1L, "alice", "USER");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        Optional<User> result = userService.findByUsername("alice");

        assertTrue(result.isPresent());
        assertEquals(1L, result.get().getId());
    }

    @Test
    void findByUsername_notFound_returnsEmpty() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        Optional<User> result = userService.findByUsername("ghost");

        assertTrue(result.isEmpty());
    }

    // ==================== createUser ====================

    @Test
    void createUser_encodesPasswordAndSetsRole() {
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(passwordEncoder.encode("rawPwd")).thenReturn("$2a$encoded");
        User saved = makeUser(10L, "newuser", "USER");
        when(userRepository.save(any(User.class))).thenReturn(saved);

        User result = userService.createUser("newuser", "rawPwd", "New User", "USER");

        assertEquals("newuser", result.getUsername());
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User captured = captor.getValue();
        assertEquals("$2a$encoded", captured.getPassword());
        assertEquals("USER", captured.getRole());
        assertEquals("New User", captured.getNickname());
    }

    @Test
    void createUser_adminRole() {
        when(userRepository.existsByUsername("admin")).thenReturn(false);
        when(passwordEncoder.encode("pwd")).thenReturn("enc");
        User saved = makeUser(11L, "admin", "ADMIN");
        when(userRepository.save(any(User.class))).thenReturn(saved);

        User result = userService.createUser("admin", "pwd", null, "ADMIN");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals("ADMIN", captor.getValue().getRole());
        // nickname falls back to username when null
        assertEquals("admin", captor.getValue().getNickname());
    }

    @Test
    void createUser_invalidRole_defaultsToUser() {
        when(userRepository.existsByUsername("u")).thenReturn(false);
        when(passwordEncoder.encode("p")).thenReturn("enc");
        User saved = makeUser(12L, "u", "USER");
        when(userRepository.save(any(User.class))).thenReturn(saved);

        userService.createUser("u", "p", "U", "INVALID_ROLE");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals("USER", captor.getValue().getRole());
    }

    @Test
    void createUser_threeArgDelegatesToFourArg() {
        when(userRepository.existsByUsername("u")).thenReturn(false);
        when(passwordEncoder.encode("p")).thenReturn("enc");
        User saved = makeUser(13L, "u", "USER");
        when(userRepository.save(any(User.class))).thenReturn(saved);

        userService.createUser("u", "p", "Nick");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals("USER", captor.getValue().getRole());
        assertEquals("Nick", captor.getValue().getNickname());
    }

    @Test
    void createUser_duplicateUsername_throws() {
        when(userRepository.existsByUsername("existing")).thenReturn(true);

        assertThrows(BadRequestException.class,
                () -> userService.createUser("existing", "pwd", "nick", "USER"));

        verify(userRepository, never()).save(any());
    }

    // ==================== deleteUser ====================

    @Test
    void deleteUser_normalUser_deletes() {
        User user = makeUser(2L, "bob", "USER");
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));

        userService.deleteUser(2L);

        verify(userRepository).deleteById(2L);
    }

    @Test
    void deleteUser_notFound_throws() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> userService.deleteUser(99L));
    }

    @Test
    void deleteUser_superAdmin_throws() {
        User sa = makeUser(1L, "admin", "SUPER_ADMIN");
        when(userRepository.findById(1L)).thenReturn(Optional.of(sa));

        assertThrows(ForbiddenException.class, () -> userService.deleteUser(1L));
        verify(userRepository, never()).deleteById(anyLong());
    }

    // ==================== resetPassword ====================

    @Test
    void resetPassword_encodesAndSaves() {
        User user = makeUser(2L, "bob", "USER");
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("newPass")).thenReturn("$2a$newEncoded");

        userService.resetPassword(2L, "newPass");

        assertEquals("$2a$newEncoded", user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    void resetPassword_userNotFound_throws() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class,
                () -> userService.resetPassword(99L, "newPwd"));
    }

    // ==================== changeUserRole ====================

    @Test
    void changeUserRole_validRole_updates() {
        User user = makeUser(2L, "bob", "USER");
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));

        userService.changeUserRole(2L, "ADMIN");

        assertEquals("ADMIN", user.getRole());
        verify(userRepository).save(user);
    }

    @Test
    void changeUserRole_superAdmin_throws() {
        User sa = makeUser(1L, "admin", "SUPER_ADMIN");
        when(userRepository.findById(1L)).thenReturn(Optional.of(sa));

        assertThrows(ForbiddenException.class,
                () -> userService.changeUserRole(1L, "USER"));
    }

    @Test
    void changeUserRole_invalidRole_throws() {
        User user = makeUser(2L, "bob", "USER");
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));

        assertThrows(BadRequestException.class,
                () -> userService.changeUserRole(2L, "SUPER_ADMIN"));
    }

    @Test
    void changeUserRole_userNotFound_throws() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class,
                () -> userService.changeUserRole(99L, "ADMIN"));
    }

    // ==================== batchDeleteUsers ====================

    @Test
    void batchDeleteUsers_deletesNonSuperAdmins() {
        User user1 = makeUser(2L, "bob", "USER");
        User user2 = makeUser(3L, "charlie", "ADMIN");
        User sa = makeUser(1L, "admin", "SUPER_ADMIN");

        when(userRepository.findById(2L)).thenReturn(Optional.of(user1));
        when(userRepository.findById(3L)).thenReturn(Optional.of(user2));
        when(userRepository.findById(1L)).thenReturn(Optional.of(sa));

        int deleted = userService.batchDeleteUsers(Arrays.asList(2L, 3L, 1L));

        assertEquals(2, deleted);
        verify(userRepository).delete(user1);
        verify(userRepository).delete(user2);
        verify(userRepository, never()).delete(sa);
    }

    @Test
    void batchDeleteUsers_skipsNonExisting() {
        User user = makeUser(2L, "bob", "USER");
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        int deleted = userService.batchDeleteUsers(Arrays.asList(2L, 99L));

        assertEquals(1, deleted);
        verify(userRepository).delete(user);
    }

    @Test
    void batchDeleteUsers_emptyList_returnsZero() {
        int deleted = userService.batchDeleteUsers(Collections.emptyList());

        assertEquals(0, deleted);
        verify(userRepository, never()).findById(anyLong());
    }

    // ==================== isSuperAdmin / isAdmin ====================

    @Test
    void isSuperAdmin_withSuperAdmin_returnsTrue() {
        User sa = makeUser(1L, "admin", "SUPER_ADMIN");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(sa));

        assertTrue(userService.isSuperAdmin("admin"));
    }

    @Test
    void isSuperAdmin_withAdmin_returnsFalse() {
        User admin = makeUser(2L, "mgr", "ADMIN");
        when(userRepository.findByUsername("mgr")).thenReturn(Optional.of(admin));

        assertFalse(userService.isSuperAdmin("mgr"));
    }

    @Test
    void isSuperAdmin_userNotFound_returnsFalse() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertFalse(userService.isSuperAdmin("ghost"));
    }

    @Test
    void isAdmin_withSuperAdmin_returnsTrue() {
        User sa = makeUser(1L, "admin", "SUPER_ADMIN");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(sa));

        assertTrue(userService.isAdmin("admin"));
    }

    @Test
    void isAdmin_withAdmin_returnsTrue() {
        User admin = makeUser(2L, "mgr", "ADMIN");
        when(userRepository.findByUsername("mgr")).thenReturn(Optional.of(admin));

        assertTrue(userService.isAdmin("mgr"));
    }

    @Test
    void isAdmin_withUser_returnsFalse() {
        User user = makeUser(3L, "bob", "USER");
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(user));

        assertFalse(userService.isAdmin("bob"));
    }

    @Test
    void isAdmin_userNotFound_returnsFalse() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertFalse(userService.isAdmin("ghost"));
    }

    // ==================== register ====================

    @Test
    void register_firstUser_createsSuperAdmin() {
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.existsByUsername("first")).thenReturn(false);
        when(passwordEncoder.encode("pwd")).thenReturn("$2a$enc");
        User saved = makeUser(1L, "first", "SUPER_ADMIN");
        when(userRepository.save(any(User.class))).thenReturn(saved);

        RegisterRequest req = new RegisterRequest();
        req.setUsername("first");
        req.setPassword("pwd");
        req.setNickname("First");

        User result = userService.register(req);

        assertEquals("first", result.getUsername());
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals("SUPER_ADMIN", captor.getValue().getRole());
        assertEquals("$2a$enc", captor.getValue().getPassword());
        assertEquals("First", captor.getValue().getNickname());
    }

    @Test
    void register_defaultNickname_usesUsername() {
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.existsByUsername("first")).thenReturn(false);
        when(passwordEncoder.encode("pwd")).thenReturn("$2a$enc");
        User saved = makeUser(1L, "first", "SUPER_ADMIN");
        when(userRepository.save(any(User.class))).thenReturn(saved);

        RegisterRequest req = new RegisterRequest();
        req.setUsername("first");
        req.setPassword("pwd");
        req.setNickname(null);

        userService.register(req);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals("first", captor.getValue().getNickname());
    }

    @Test
    void register_existingUsers_throws() {
        when(userRepository.count()).thenReturn(5L);

        RegisterRequest req = new RegisterRequest();
        req.setUsername("new");
        req.setPassword("pwd");

        assertThrows(BadRequestException.class, () -> userService.register(req));
    }

    @Test
    void register_duplicateUsername_throws() {
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.existsByUsername("dup")).thenReturn(true);

        RegisterRequest req = new RegisterRequest();
        req.setUsername("dup");
        req.setPassword("pwd");

        assertThrows(BadRequestException.class, () -> userService.register(req));
    }

    // ==================== loginAndReturnUser ====================

    @Test
    void loginAndReturnUser_bcryptMatch_returnsUser() {
        User user = makeUser(1L, "alice", "USER");
        user.setPassword("$2a$encoded");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("rawPwd", "$2a$encoded")).thenReturn(true);

        LoginRequest req = new LoginRequest();
        req.setUsername("alice");
        req.setPassword("rawPwd");

        User result = userService.loginAndReturnUser(req);

        assertEquals("alice", result.getUsername());
    }

    @Test
    void loginAndReturnUser_userNotFound_throws() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        LoginRequest req = new LoginRequest();
        req.setUsername("ghost");
        req.setPassword("pwd");

        assertThrows(NotFoundException.class, () -> userService.loginAndReturnUser(req));
    }

    @Test
    void loginAndReturnUser_wrongPassword_throws() {
        User user = makeUser(1L, "alice", "USER");
        user.setPassword("$2a$encoded");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "$2a$encoded")).thenReturn(false);
        // SHA-256 of "wrong" won't match "$2a$encoded" either

        LoginRequest req = new LoginRequest();
        req.setUsername("alice");
        req.setPassword("wrong");

        assertThrows(BadRequestException.class, () -> userService.loginAndReturnUser(req));
    }

    @Test
    void loginAndReturnUser_legacySha256_migratesToBcrypt() {
        User user = makeUser(1L, "alice", "USER");
        String sha256Hash = HashUtils.sha256Hex("oldPwd");
        user.setPassword(sha256Hash);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPwd", sha256Hash)).thenReturn(false);
        when(passwordEncoder.encode("oldPwd")).thenReturn("$2a$newEnc");
        when(userRepository.save(user)).thenReturn(user);

        LoginRequest req = new LoginRequest();
        req.setUsername("alice");
        req.setPassword("oldPwd");

        User result = userService.loginAndReturnUser(req);

        assertEquals("$2a$newEnc", result.getPassword());
        verify(userRepository).save(user);
    }

    // ==================== changePassword ====================

    @Test
    void changePassword_correctOldPassword_updates() {
        User user = makeUser(1L, "alice", "USER");
        user.setPassword("$2a$oldEnc");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPwd", "$2a$oldEnc")).thenReturn(true);
        when(passwordEncoder.encode("newPwd")).thenReturn("$2a$newEnc");

        userService.changePassword("alice", "oldPwd", "newPwd");

        assertEquals("$2a$newEnc", user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    void changePassword_wrongOldPassword_throws() {
        User user = makeUser(1L, "alice", "USER");
        user.setPassword("$2a$oldEnc");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongPwd", "$2a$oldEnc")).thenReturn(false);

        assertThrows(BadRequestException.class,
                () -> userService.changePassword("alice", "wrongPwd", "newPwd"));
    }

    @Test
    void changePassword_userNotFound_throws() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class,
                () -> userService.changePassword("ghost", "old", "new"));
    }

    // ==================== changeNickname ====================

    @Test
    void changeNickname_updatesAndSaves() {
        User user = makeUser(1L, "alice", "USER");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        userService.changeNickname("alice", "NewNick");

        assertEquals("NewNick", user.getNickname());
        verify(userRepository).save(user);
    }

    @Test
    void changeNickname_userNotFound_throws() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class,
                () -> userService.changeNickname("ghost", "Nick"));
    }

    // ==================== migrateExistingUsers ====================

    @Test
    void migrateExistingUsers_setsSuperAdminToFirstUser() {
        User u1 = makeUser(1L, "a", null);
        User u2 = makeUser(2L, "b", null);
        when(userRepository.findAll()).thenReturn(Arrays.asList(u1, u2));

        userService.migrateExistingUsers();

        assertEquals("SUPER_ADMIN", u1.getRole());
        assertEquals("ADMIN", u2.getRole());
        verify(userRepository).saveAll(anyList());
    }

    @Test
    void migrateExistingUsers_noChange_noSave() {
        User sa = makeUser(1L, "a", "SUPER_ADMIN");
        User admin = makeUser(2L, "b", "ADMIN");
        when(userRepository.findAll()).thenReturn(Arrays.asList(sa, admin));

        userService.migrateExistingUsers();

        verify(userRepository, never()).saveAll(anyList());
    }
}
