package com.genealogy.server.service;

import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.*;
import com.genealogy.server.repository.*;
import net.sourceforge.pinyin4j.PinyinHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AccountDerivationService {

    private static final Logger log = LoggerFactory.getLogger(AccountDerivationService.class);
    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final int PASSWORD_LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PersonRepository personRepository;
    private final UserRepository userRepository;
    private final PersonAccountRepository personAccountRepository;
    private final PublicationAccessRepository publicationAccessRepository;
    private final UserService userService;

    public AccountDerivationService(PersonRepository personRepository,
                                    UserRepository userRepository,
                                    PersonAccountRepository personAccountRepository,
                                    PublicationAccessRepository publicationAccessRepository,
                                    UserService userService) {
        this.personRepository = personRepository;
        this.userRepository = userRepository;
        this.personAccountRepository = personAccountRepository;
        this.publicationAccessRepository = publicationAccessRepository;
        this.userService = userService;
    }

    @Transactional
    public List<Map<String, Object>> deriveAccounts(Long publicationId) {
        List<Person> persons = personRepository.findByPublicationId(publicationId);
        List<Map<String, Object>> created = new ArrayList<>();

        for (Person person : persons) {
            if (Boolean.TRUE.equals(person.getDeceased())) continue;
            // 双重校验：death 字段有值也视为已故
            if (person.getDeath() != null && !person.getDeath().isBlank()) continue;
            if (personAccountRepository.existsByPersonDbId(person.getId())) continue;

            String username = generateUsername(person.getName(), publicationId);
            while (userRepository.findByUsername(username).isPresent()) {
                username = generateUsername(person.getName(), publicationId) + "_" + (int)(Math.random() * 1000);
            }
            String password = generateRandomPassword();

            User user = userService.createUser(username, password, person.getName());

            PersonAccount pa = new PersonAccount();
            pa.setPersonDbId(person.getId());
            pa.setUserId(user.getId());
            pa.setPublicationId(publicationId);
            personAccountRepository.save(pa);

            publicationAccessRepository.findByPublicationIdAndUserId(publicationId, user.getId())
                    .orElseGet(() -> {
                        PublicationAccess access = new PublicationAccess();
                        access.setPublicationId(publicationId);
                        access.setUserId(user.getId());
                        access.setRole("VIEWER");
                        return publicationAccessRepository.save(access);
                    });

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("personDbId", person.getId());
            entry.put("personName", person.getName());
            entry.put("username", username);
            entry.put("password", password);
            created.add(entry);

            log.info("Derived account for person '{}' (id={}) in publication {}", person.getName(), person.getId(), publicationId);
        }

        return created;
    }

    public List<Map<String, Object>> listAccounts(Long publicationId) {
        List<PersonAccount> accounts = personAccountRepository.findByPublicationId(publicationId);
        List<Person> persons = personRepository.findByPublicationId(publicationId);

        Map<Long, Person> personMap = persons.stream()
                .collect(Collectors.toMap(Person::getId, p -> p));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Person person : persons) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("personDbId", person.getId());
            row.put("personName", person.getName());
            row.put("gender", person.getGender());
            row.put("deceased", Boolean.TRUE.equals(person.getDeceased()));

            Optional<PersonAccount> account = accounts.stream()
                    .filter(a -> a.getPersonDbId().equals(person.getId()))
                    .findFirst();

            if (account.isPresent()) {
                Optional<User> user = userRepository.findById(account.get().getUserId());
                if (user.isPresent()) {
                    row.put("accountStatus", account.get().getStatus());
                    row.put("username", user.get().getUsername());
                } else {
                    row.put("accountStatus", "orphaned");
                    row.put("username", null);
                }
            } else {
                row.put("accountStatus", null);
                row.put("username", null);
            }
            result.add(row);
        }

        return result;
    }

    @Transactional
    public void deleteAccount(Long publicationId, Long personDbId) {
        PersonAccount pa = personAccountRepository.findByPersonDbId(personDbId)
                .orElseThrow(() -> new NotFoundException("未找到该人物的账号"));

        // 清理派生账号带来的 VIEWER 协作权限记录
        publicationAccessRepository.deleteByUserId(pa.getUserId());
        personAccountRepository.deleteByPersonDbId(personDbId);
        log.info("Deleted account for person_db_id={} in publication {}", personDbId, publicationId);
    }

    @Transactional
    public int cleanupOrphanedAccounts(Long publicationId) {
        List<PersonAccount> allAccounts = personAccountRepository.findByPublicationId(publicationId);
        int count = 0;
        List<Long> orphanUserIds = new ArrayList<>();
        List<Long> orphanPersonDbIds = new ArrayList<>();

        for (PersonAccount pa : allAccounts) {
            if (userRepository.findById(pa.getUserId()).isEmpty()) {
                orphanUserIds.add(pa.getUserId());
                orphanPersonDbIds.add(pa.getPersonDbId());
                count++;
            }
        }

        if (count > 0) {
            for (Long userId : orphanUserIds) {
                publicationAccessRepository.deleteByUserId(userId);
            }
            for (Long personDbId : orphanPersonDbIds) {
                personAccountRepository.deleteByPersonDbId(personDbId);
            }
            log.info("Cleaned up {} orphaned accounts in publication {}", count, publicationId);
        }

        return count;
    }

    @Transactional
    public void disableAccount(Long personDbId) {
        PersonAccount pa = personAccountRepository.findByPersonDbId(personDbId)
                .orElseThrow(() -> new NotFoundException("未找到该人物的账号"));
        pa.setStatus("disabled");
        personAccountRepository.save(pa);
    }

    @Transactional
    public void enableAccount(Long personDbId) {
        PersonAccount pa = personAccountRepository.findByPersonDbId(personDbId)
                .orElseThrow(() -> new NotFoundException("未找到该人物的账号"));
        pa.setStatus("active");
        personAccountRepository.save(pa);
    }

    @Transactional
    public String resetPassword(Long personDbId) {
        PersonAccount pa = personAccountRepository.findByPersonDbId(personDbId)
                .orElseThrow(() -> new NotFoundException("未找到该人物的账号"));
        String newPassword = generateRandomPassword();
        userService.resetPassword(pa.getUserId(), newPassword);
        return newPassword;
    }

    private String generateUsername(String name, Long publicationId) {
        String pinyin = toPinyin(name);
        if (pinyin.isEmpty()) pinyin = "user";
        return pinyin + "_" + publicationId;
    }

    private String toPinyin(String name) {
        StringBuilder sb = new StringBuilder();
        for (char c : name.toCharArray()) {
            if (c <= 127) {
                // ASCII: keep letters and digits, skip others
                if (Character.isLetterOrDigit(c)) sb.append(Character.toLowerCase(c));
            } else {
                // CJK: convert to pinyin
                String[] pinyins = PinyinHelper.toHanyuPinyinStringArray(c);
                if (pinyins != null && pinyins.length > 0) {
                    // Remove tone number from pinyin (e.g., "zhang1" → "zhang")
                    sb.append(pinyins[0].replaceAll("\\d", ""));
                }
            }
        }
        return sb.toString();
    }

    private String generateRandomPassword() {
        StringBuilder sb = new StringBuilder(PASSWORD_LENGTH);
        for (int i = 0; i < PASSWORD_LENGTH; i++) {
            sb.append(PASSWORD_CHARS.charAt(RANDOM.nextInt(PASSWORD_CHARS.length())));
        }
        return sb.toString();
    }
}
