package com.genealogy.server.integration;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.FamilyMember;
import com.genealogy.server.model.Person;
import com.genealogy.server.repository.FamilyMemberRepository;
import com.genealogy.server.repository.FamilyRepository;
import com.genealogy.server.repository.PersonRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;

/**
 * 集成测试：验证分支合并引擎在真实数据库上的行为。
 * <p>
 * 覆盖两条关键路径：
 * 1. 全量合并 — mount point 指向分支族谱 → 所有人物/家庭/关系克隆到主谱
 * 2. 非法挂载点 — 非 mount point → BadRequestException
 */
@SpringBootTest
@ActiveProfiles("test")
class BranchMergeIntegrationTest {

    @Autowired
    private PublicationService publicationService;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private FamilyRepository familyRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @MockBean
    private PublicationAuthorizationService authorizationService;

    private static final long USER_ID = 1L;
    private final UserSubject actor = new UserSubject(99L, "USER", "test-merger");

    @BeforeEach
    void permitAll() {
        // 让所有鉴权检查通过
        doAnswer(inv -> null)
                .when(authorizationService)
                .require(any(UserSubject.class), anyLong(), any(AccessPermission.class));
    }

    // ──────────────────────────────────────
    // 测试数据工厂
    // ──────────────────────────────────────

    /**
     * 构建带一个人的族谱数据。
     */
    private Map<String, Object> personData(String personId, String name, String gender) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("focusFamilyId", "");

        Map<String, Object> person = new LinkedHashMap<>();
        person.put("id", personId);
        person.put("name", name);
        person.put("gender", gender);
        person.put("deceased", false);
        person.put("birth", "1990");

        Map<String, Object> people = new LinkedHashMap<>();
        people.put(personId, person);
        data.put("people", people);
        data.put("families", Map.of());

        return data;
    }

    /**
     * 构建带两个人的族谱数据 + 一个家庭。
     */
    private Map<String, Object> branchData() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("focusFamilyId", "");

        Map<String, Object> person1 = new LinkedHashMap<>();
        person1.put("id", "branch-p1");
        person1.put("name", "分支张三");
        person1.put("gender", "male");
        person1.put("deceased", false);
        person1.put("birth", "1960");

        Map<String, Object> person2 = new LinkedHashMap<>();
        person2.put("id", "branch-p2");
        person2.put("name", "分支李四");
        person2.put("gender", "female");
        person2.put("deceased", false);
        person2.put("birth", "1965");

        Map<String, Object> people = new LinkedHashMap<>();
        people.put("branch-p1", person1);
        people.put("branch-p2", person2);
        data.put("people", people);

        Map<String, Object> family = new LinkedHashMap<>();
        family.put("id", "branch-f1");
        family.put("adults", List.of("branch-p1", "branch-p2"));
        family.put("children", List.of());
        Map<String, Object> families = new LinkedHashMap<>();
        families.put("branch-f1", family);
        data.put("families", families);

        return data;
    }

    /**
     * 构建带挂载点属性的族谱数据。
     */
    private Map<String, Object> masterDataWithMountPoint(long targetPubId) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("focusFamilyId", "");

        Map<String, Object> mountPerson = new LinkedHashMap<>();
        mountPerson.put("id", "mount-p1");
        mountPerson.put("name", "挂载点人物");
        mountPerson.put("gender", "male");
        mountPerson.put("deceased", false);
        mountPerson.put("birth", "1950");
        mountPerson.put("isMountPoint", true);
        mountPerson.put("targetPublicationId", targetPubId);

        Map<String, Object> people = new LinkedHashMap<>();
        people.put("mount-p1", mountPerson);
        data.put("people", people);
        data.put("families", Map.of());

        return data;
    }

    // ──────────────────────────────────────
    // 测试用例
    // ──────────────────────────────────────

    /**
     * 【路径 1】全量合并：挂载点指向分支族谱 → 分支人物和家庭迁入主谱，挂载点清除。
     */
    @Test
    void fullMergeClonesPeopleAndFamiliesToMaster() {
        // 1. 创建分支族谱（两个人 + 一个家庭）
        long branchPubId = publicationService.createPublication(
                USER_ID, "分支族谱", "",
                branchData(), "{}", "{}");

        // 验证分支数据已写入
        List<Person> branchPeople = personRepository.findByPublicationId(branchPubId);
        assertThat(branchPeople).as("分支族谱应有 2 人").hasSize(2);

        // 2. 创建主谱，挂载点指向分支
        long masterPubId = publicationService.createPublication(
                USER_ID, "主谱", "",
                masterDataWithMountPoint(branchPubId), "{}", "{}");

        Person mountPoint = personRepository
                .findByPublicationIdAndPersonId(masterPubId, "mount-p1")
                .orElseThrow();
        assertThat(mountPoint.getIsMountPoint()).as("创建时应标记为挂载点").isTrue();
        assertThat(mountPoint.getTargetPublicationId()).as("应指向分支族谱").isEqualTo(branchPubId);

        // 3. 执行合并
        publicationService.mergeBranch(masterPubId, "mount-p1", actor);

        // 4. 验证主谱中已有分支人物（加上原来的挂载点，共 3 人）
        List<Person> masterPeople = personRepository.findByPublicationId(masterPubId);
        assertThat(masterPeople).as("合并后主谱应有 3 人").hasSize(3);

        // 分支人物应该带有 merged_ 前缀的 personId
        assertThat(masterPeople)
                .extracting(Person::getPersonId)
                .contains("merged_" + branchPubId + "_branch-p1",
                        "merged_" + branchPubId + "_branch-p2");

        // 验证人物姓名正确迁移
        String expectedId = "merged_" + branchPubId + "_branch-p1";
        Person mergedZhang = masterPeople.stream()
                .filter(p -> expectedId.equals(p.getPersonId()))
                .findFirst().orElseThrow();
        assertThat(mergedZhang.getName()).isEqualTo("分支张三");
        assertThat(mergedZhang.getGender()).isEqualTo("male");
        assertThat(mergedZhang.getBirth()).isEqualTo("1960");

        // 5. 验证家庭已迁移
        List<com.genealogy.server.model.Family> masterFamilies =
                familyRepository.findByPublicationId(masterPubId);
        assertThat(masterFamilies).as("合并后主谱应有 1 个家庭").hasSize(1);
        assertThat(masterFamilies.get(0).getFamilyId())
                .isEqualTo("merged_" + branchPubId + "_branch-f1");

        // 6. 验证家庭成员关系完整
        List<FamilyMember> members = familyMemberRepository
                .findByFamilyDbIdOrderBySortOrder(masterFamilies.get(0).getId());
        assertThat(members).as("家庭应有 2 个成员").hasSize(2);
        assertThat(members).extracting(FamilyMember::getRole)
                .containsExactlyInAnyOrder("adult", "adult");

        // 7. 验证挂载点已清除
        Person clearedMount = personRepository
                .findByPublicationIdAndPersonId(masterPubId, "mount-p1")
                .orElseThrow();
        assertThat(clearedMount.getIsMountPoint()).as("合并后挂载点应清除").isFalse();
        assertThat(clearedMount.getTargetPublicationId()).as("合并后目标应清空").isNull();
    }

    /**
     * 【路径 2】非法挂载点：人物不是挂载点 → BadRequestException。
     */
    @Test
    void mergeRejectsNonMountPoint() {
        long masterPubId = publicationService.createPublication(
                USER_ID, "测试主谱", "",
                personData("p1", "普通人", "male"), "{}", "{}");

        assertThatThrownBy(() ->
                publicationService.mergeBranch(masterPubId, "p1", actor))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid branch mount point");
    }

    /**
     * 【边界】不存在的 publication → NotFoundException。
     */
    @Test
    void mergeWithInvalidPubIdThrowsNotFound() {
        assertThatThrownBy(() ->
                publicationService.mergeBranch(99999L, "someone", actor))
                .isInstanceOf(NotFoundException.class);
    }
}
