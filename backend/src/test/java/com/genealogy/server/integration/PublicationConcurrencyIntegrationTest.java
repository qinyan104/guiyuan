package com.genealogy.server.integration;

import com.genealogy.server.exception.ConflictException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.PublicationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 集成测试：验证并发编辑下的乐观锁行为。
 * 使用 H2 (MySQL 兼容模式) 模拟真实数据库，不走 mock。
 * <p>
 * 覆盖三条关键路径：
 * 1. 正常更新 — 版本号正确 → 成功，版本号递增
 * 2. 冲突检测 — 版本号过期 → ConflictException
 * 3. 数据完整性 — 更新后重新加载 → 数据正确持久化
 */
@SpringBootTest
@ActiveProfiles("test")
class PublicationConcurrencyIntegrationTest {

    @Autowired
    private PublicationService publicationService;

    /**
     * 仅 mock 鉴权服务，让所有操作通过权限检查。
     * PublicationService 内部不直接调 authorizationService（鉴权在 Controller 层），
     * 但 Spring 容器启动需要这个 bean。
     */
    @MockBean
    private PublicationAuthorizationService authorizationService;

    private static final long USER_ID = 1L;

    // ──────────────────────────────────────
    // 测试数据工厂
    // ──────────────────────────────────────

    /**
     * 构建最小可用的族谱数据：一个人 + 一个空家庭。
     */
    private Map<String, Object> minimalPublicationData() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("focusFamilyId", "");

        // people: 一个在世人物 "张三"
        Map<String, Object> people = new LinkedHashMap<>();
        Map<String, Object> person = new LinkedHashMap<>();
        person.put("id", "p1");
        person.put("name", "张三");
        person.put("gender", "male");
        person.put("deceased", false);
        person.put("birth", "1990");
        people.put("p1", person);
        data.put("people", people);

        // families: 一个空家庭（包含 p1 为根）
        Map<String, Object> families = new LinkedHashMap<>();
        Map<String, Object> family = new LinkedHashMap<>();
        family.put("id", "f1");
        family.put("adults", java.util.List.of("p1"));
        family.put("children", java.util.List.of());
        families.put("f1", family);
        data.put("families", families);

        return data;
    }

    /**
     * 修改人物姓名的族谱数据（用于更新测试）。
     */
    private Map<String, Object> renamedData(String newName) {
        Map<String, Object> data = minimalPublicationData();
        @SuppressWarnings("unchecked")
        Map<String, Object> people = (Map<String, Object>) data.get("people");
        @SuppressWarnings("unchecked")
        Map<String, Object> person = (Map<String, Object>) people.get("p1");
        person.put("name", newName);
        return data;
    }

    // ──────────────────────────────────────
    // 测试用例
    // ──────────────────────────────────────

    /**
     * 【路径 1】正常更新：用正确的 revision 保存 → 成功，版本号递增。
     */
    @Test
    void normalUpdateWithCorrectRevisionShouldSucceed() {
        // 创建
        long pubId = publicationService.createPublication(
                USER_ID, "并发测试族谱", "",
                minimalPublicationData(), "{}", "{}");

        // 首次更新：revision 传 null（等同于客户端未携带版本号，后端视为 -1）
        // 创建后 revision 为 0（JPA 初始值），null 被转为 -1，不等于 0 → 冲突
        // 所以必须先 load 拿到真实 revision
        Map<String, Object> loaded = publicationService.loadPublication(pubId);
        long revision = ((Number) loaded.get("revision")).longValue();

        var result = publicationService.updatePublication(
                pubId, revision, "并发测试族谱（已更新）", "",
                renamedData("张三丰"), "{}", "{}");

        assertThat(result).isNotNull();
        assertThat(result.newRevision())
                .as("版本号应该递增")
                .isEqualTo(revision + 1);
    }

    /**
     * 【路径 2】冲突检测：用过期 revision 保存 → ConflictException。
     *
     * 模拟场景：
     * - 用户 A 打开族谱，看到 revision=0
     * - 用户 B 先保存成功，revision 变成 1
     * - 用户 A 再保存，携带 revision=0 → 后端拒绝
     */
    @Test
    void staleRevisionShouldThrowConflictException() {
        long pubId = publicationService.createPublication(
                USER_ID, "冲突测试族谱", "",
                minimalPublicationData(), "{}", "{}");

        // 模拟用户 A 拿到 revision
        long revisionA = ((Number) publicationService.loadPublication(pubId)
                .get("revision")).longValue();

        // 模拟用户 B 先保存（用同一个 revision）
        publicationService.updatePublication(
                pubId, revisionA, "冲突测试族谱（B先保存）", "",
                renamedData("李四"), "{}", "{}");

        // 用户 A 再保存，用的还是旧 revision → 必须炸
        assertThatThrownBy(() -> publicationService.updatePublication(
                pubId, revisionA, "冲突测试族谱（A晚了）", "",
                renamedData("王五"), "{}", "{}"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("数据已过期");
    }

    /**
     * 【路径 3】数据完整性：更新后重新加载，验证数据正确写入数据库。
     */
    @Test
    void dataIntegrityAfterUpdate() {
        long pubId = publicationService.createPublication(
                USER_ID, "完整性测试", "",
                minimalPublicationData(), "{}", "{}");

        long rev = ((Number) publicationService.loadPublication(pubId)
                .get("revision")).longValue();

        // 更新人物名 + 标题
        publicationService.updatePublication(
                pubId, rev, "完整性测试（已修改）", "副标题测试",
                renamedData("赵六"), "{}", "{}");

        // 重新从数据库加载
        Map<String, Object> reloaded = publicationService.loadPublication(pubId);

        // loadPublication 结构：{ id, revision, publication: { title, subtitle, people, ... }, settings }
        @SuppressWarnings("unchecked")
        Map<String, Object> pubBlock = (Map<String, Object>) reloaded.get("publication");

        assertThat(pubBlock.get("title"))
                .as("标题应该被更新")
                .isEqualTo("完整性测试（已修改）");

        assertThat(pubBlock.get("subtitle"))
                .as("副标题应该被更新")
                .isEqualTo("副标题测试");

        @SuppressWarnings("unchecked")
        Map<String, Object> people = (Map<String, Object>) pubBlock.get("people");

        assertThat(people).isNotNull().containsKey("p1");

        @SuppressWarnings("unchecked")
        Map<String, Object> person = (Map<String, Object>) people.get("p1");
        assertThat(person.get("name"))
                .as("人物姓名应该被更新为赵六")
                .isEqualTo("赵六");
    }

    /**
     * 【边界】请求一个不存在的 publication → NotFoundException。
     */
    @Test
    void updateNonExistentPublicationShouldThrowNotFound() {
        assertThatThrownBy(() -> publicationService.updatePublication(
                99999L, 0L, "不存在", "",
                minimalPublicationData(), "{}", "{}"))
                .isInstanceOf(NotFoundException.class);
    }
}
