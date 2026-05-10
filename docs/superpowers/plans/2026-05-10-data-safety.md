# 数据安全兜底 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time data validation, database restore, and consistency scanning to make the genealogy system safe for real family use.

**Architecture:** Backend-first: new utility class + service methods + controller endpoints. Frontend changes are thin wrappers (API calls + UI buttons). All new backend logic is tested with JUnit 5 + Mockito.

**Tech Stack:** Java 17, Spring Boot 3.3, JPA, Vue 3 + TypeScript

---

## File Structure

| File | Purpose |
|------|---------|
| `backend/.../util/DateTextParser.java` | Extract year integer from free-text date strings |
| `backend/.../util/DateTextParserTest.java` | Test year extraction for 8+ formats |
| `backend/.../service/PublicationService.java` | Add V1/V2/V3 validation calls in `savePersonsAndFamilies` |
| `backend/.../service/DataValidationTest.java` | Test validation rules independently |
| `backend/.../service/BackupService.java` | Add `restoreDatabase(InputStream)` method |
| `backend/.../controller/AdminController.java` | Add `restoreDatabase` and `consistencyCheck` endpoints |
| `backend/.../dto/ConsistencyReport.java` | DTO for scan results |
| `backend/.../service/ConsistencyService.java` | Scan logic (orphans, date conflicts, status conflicts, empty families) |
| `frontend/src/api/admin.ts` | Add `adminRestoreDatabase` and `adminCheckConsistency` API calls |
| `frontend/src/views/SettingsView.vue` | Add restore upload + consistency check UI sections |

---

### Task 1: DateTextParser Utility

**Files:**
- Create: `backend/src/main/java/com/genealogy/server/util/DateTextParser.java`
- Create: `backend/src/test/java/com/genealogy/server/util/DateTextParserTest.java`

- [ ] **Step 1: Write the failing test**

```java
// backend/src/test/java/com/genealogy/server/util/DateTextParserTest.java
package com.genealogy.server.util;

import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;

class DateTextParserTest {

    @Test
    void testPureYear() {
        assertThat(DateTextParser.extractYear("2024")).hasValue(2024);
    }

    @Test
    void testIsoDate() {
        assertThat(DateTextParser.extractYear("2024-01-15")).hasValue(2024);
    }

    @Test
    void testChineseDate() {
        assertThat(DateTextParser.extractYear("2024年1月15日")).hasValue(2024);
    }

    @Test
    void testChineseDateNoLeadingZero() {
        assertThat(DateTextParser.extractYear("2024年1月5日")).hasValue(2024);
    }

    @Test
    void testChineseImperialEra() {
        assertThat(DateTextParser.extractYear("康熙六十年")).isEmpty();
    }

    @Test
    void testNullInput() {
        assertThat(DateTextParser.extractYear(null)).isEmpty();
    }

    @Test
    void testEmptyString() {
        assertThat(DateTextParser.extractYear("")).isEmpty();
    }

    @Test
    void testBlankString() {
        assertThat(DateTextParser.extractYear("   ")).isEmpty();
    }

    @Test
    void testYearInMiddleOfText() {
        assertThat(DateTextParser.extractYear("生于公元2024年")).hasValue(2024);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest="DateTextParserTest" --batch-mode`
Expected: compilation FAIL — class not found

- [ ] **Step 3: Write minimal implementation**

```java
// backend/src/main/java/com/genealogy/server/util/DateTextParser.java
package com.genealogy.server.util;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class DateTextParser {

    private static final Pattern YEAR_PATTERN = Pattern.compile("(\\d{4})");

    private DateTextParser() {}

    public static Optional<Integer> extractYear(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }
        Matcher m = YEAR_PATTERN.matcher(text);
        if (m.find()) {
            int year = Integer.parseInt(m.group(1));
            return Optional.of(year);
        }
        return Optional.empty();
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./mvnw test -Dtest="DateTextParserTest" --batch-mode`
Expected: Tests run: 9, Failures: 0, BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/util/DateTextParser.java \
        backend/src/test/java/com/genealogy/server/util/DateTextParserTest.java
git commit -m "feat: add DateTextParser for extracting year from free-text dates"
```

---

### Task 2: Data Validation in PublicationService

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/service/PublicationService.java`
- Create: `backend/src/test/java/com/genealogy/server/service/DataValidationTest.java`

- [ ] **Step 1: Write failing validation tests**

```java
// backend/src/test/java/com/genealogy/server/service/DataValidationTest.java
package com.genealogy.server.service;

import com.genealogy.server.dto.BadRequestException;
import com.genealogy.server.model.Person;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

class DataValidationTest {

    // V1: birth year > death year → reject
    @Test
    void testBirthAfterDeath_ThrowsException() {
        Map<String, Object> person = new HashMap<>();
        person.put("birth", "2024");
        person.put("death", "2020");
        assertThatThrownBy(() ->
            PublicationService.validatePersonDates(person)
        ).isInstanceOf(BadRequestException.class)
         .hasMessageContaining("出生年份不能晚于去世年份");
    }

    // V1: birth == death → ok (同年生卒，如婴儿夭折)
    @Test
    void testBirthEqualsDeath_Ok() {
        Map<String, Object> person = new HashMap<>();
        person.put("birth", "2024");
        person.put("death", "2024");
        assertThatCode(() ->
            PublicationService.validatePersonDates(person)
        ).doesNotThrowAnyException();
    }

    // V1: birth before death → ok
    @Test
    void testBirthBeforeDeath_Ok() {
        Map<String, Object> person = new HashMap<>();
        person.put("birth", "2020");
        person.put("death", "2024");
        assertThatCode(() ->
            PublicationService.validatePersonDates(person)
        ).doesNotThrowAnyException();
    }

    // V1: missing dates → skip validation silently
    @Test
    void testMissingDates_Ok() {
        Map<String, Object> person = new HashMap<>();
        assertThatCode(() ->
            PublicationService.validatePersonDates(person)
        ).doesNotThrowAnyException();
    }

    // V2: deceased=true but no death date → reject
    @Test
    void testDeceasedWithoutDeathDate_ThrowsException() {
        Map<String, Object> person = new HashMap<>();
        person.put("deceased", true);
        assertThatThrownBy(() ->
            PublicationService.validatePersonLifeStatus(person)
        ).isInstanceOf(BadRequestException.class)
         .hasMessageContaining("已故人物必须填写去世日期");
    }

    // V2: deceased=false with death date → ok (might be planned/unknown)
    @Test
    void testNotDeceasedWithDeathDate_Ok() {
        Map<String, Object> person = new HashMap<>();
        person.put("deceased", false);
        person.put("death", "2024");
        assertThatCode(() ->
            PublicationService.validatePersonLifeStatus(person)
        ).doesNotThrowAnyException();
    }

    // V3: circular ancestry detection
    @Test
    void testCircularAncestry_ThrowsException() {
        // A's parent is B, and B's parent chain includes A → cycle
        Map<String, String> childToParent = new HashMap<>();
        childToParent.put("A", "B");
        childToParent.put("B", "A"); // cycle
        assertThatThrownBy(() ->
            PublicationService.checkCircularAncestry(childToParent)
        ).isInstanceOf(BadRequestException.class)
         .hasMessageContaining("循环祖先引用");
    }

    // V3: valid ancestry chain → ok
    @Test
    void testValidAncestry_Ok() {
        Map<String, String> childToParent = new HashMap<>();
        childToParent.put("A", "B");
        childToParent.put("B", "C");
        childToParent.put("C", "D");
        assertThatCode(() ->
            PublicationService.checkCircularAncestry(childToParent)
        ).doesNotThrowAnyException();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest="DataValidationTest" --batch-mode`
Expected: compilation FAIL — methods not found

- [ ] **Step 3: Add validation methods to PublicationService**

At the end of `PublicationService.java` (after `collectSubtreeIds`, around line 693), add three package-visible static methods:

```java
// Add these imports at the top of PublicationService.java:
// import com.genealogy.server.util.DateTextParser;

static void validatePersonDates(Map<String, Object> person) {
    String birth = (String) person.get("birth");
    String death = (String) person.get("death");
    if (birth == null || birth.isBlank() || death == null || death.isBlank()) {
        return;
    }
    var birthYear = DateTextParser.extractYear(birth);
    var deathYear = DateTextParser.extractYear(death);
    if (birthYear.isPresent() && deathYear.isPresent()
            && birthYear.get() > deathYear.get()) {
        throw new BadRequestException("出生年份不能晚于去世年份");
    }
}

static void validatePersonLifeStatus(Map<String, Object> person) {
    Boolean deceased = (Boolean) person.get("deceased");
    String death = (String) person.get("death");
    if (Boolean.TRUE.equals(deceased) && (death == null || death.isBlank())) {
        throw new BadRequestException("已故人物必须填写去世日期");
    }
}

static void checkCircularAncestry(Map<String, String> childToParent) {
    for (String childId : childToParent.keySet()) {
        Set<String> visited = new HashSet<>();
        String current = childToParent.get(childId);
        while (current != null && visited.size() < 50) {
            if (!visited.add(current)) {
                break; // already visited, no cycle from this path
            }
            if (current.equals(childId)) {
                throw new BadRequestException("检测到循环祖先引用：人物 " + childId + " 的祖先链中包含自身");
            }
            current = childToParent.get(current);
        }
    }
}
```

- [ ] **Step 4: Wire validation calls into savePersonsAndFamilies**

In `savePersonsAndFamilies`, after the existing cross-family duplicate validation (after the `if (!errors.isEmpty()) throw` block, around line 551), add:

```java
// Data validation: check each person's birth/death dates and life status
for (Map.Entry<String, Object> entry : people.entrySet()) {
    @SuppressWarnings("unchecked")
    Map<String, Object> person = (Map<String, Object>) entry.getValue();
    validatePersonDates(person);
    validatePersonLifeStatus(person);
}

// Build ancestry map from current families and check for circular references
Map<String, String> childToParent = new HashMap<>();
for (Map.Entry<String, Map<String, Object>> entry : families.entrySet()) {
    @SuppressWarnings("unchecked")
    Map<String, Object> family = entry.getValue();
    List<String> adults = (List<String>) family.getOrDefault("adults", List.of());
    List<String> children = (List<String>) family.getOrDefault("children", List.of());
    for (String childId : children) {
        if (!adults.isEmpty()) {
            childToParent.putIfAbsent(childId, adults.get(0));
        }
    }
}
checkCircularAncestry(childToParent);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && ./mvnw test -Dtest="DataValidationTest,PublicationServiceTest" --batch-mode`
Expected: All tests pass, BUILD SUCCESS

- [ ] **Step 6: Run full backend test suite**

Run: `cd backend && ./mvnw test --batch-mode`
Expected: Tests run: 110 (was 107 + 3 new tests from Task 1 + DataValidationTest), Failures: 0

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/service/PublicationService.java \
        backend/src/test/java/com/genealogy/server/service/DataValidationTest.java
git commit -m "feat: add data validation for birth/death dates, life status, and circular ancestry"
```

---

### Task 3: Database Restore

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/service/BackupService.java`
- Modify: `backend/src/main/java/com/genealogy/server/controller/AdminController.java`
- Modify: `frontend/src/api/admin.ts`
- Modify: `frontend/src/views/SettingsView.vue`

- [ ] **Step 1: Add restoreDatabase method to BackupService**

Append to `BackupService.java` (before the closing `}`):

```java
public void restoreDatabase(InputStream sqlStream) throws IOException, InterruptedException {
    String dbName = extractDbName(datasourceUrl);
    String host = extractHost(datasourceUrl);
    int port = extractPort(datasourceUrl);

    ProcessBuilder pb = new ProcessBuilder(
        "mysql",
        "-h" + host,
        "-P" + port,
        "-u" + datasourceUsername,
        "--default-character-set=utf8mb4",
        dbName
    );
    pb.environment().put("MYSQL_PWD", datasourcePassword);
    pb.redirectErrorStream(true);

    Process process = pb.start();
    try (var stdin = process.getOutputStream()) {
        sqlStream.transferTo(stdin);
    }
    int exitCode = process.waitFor();
    if (exitCode != 0) {
        String errorOutput = new String(process.getInputStream().readAllBytes());
        throw new IOException("数据库还原失败 (exit " + exitCode + "): " + errorOutput);
    }
}
```

- [ ] **Step 2: Add restoreDatabase endpoint to AdminController**

Add these imports to `AdminController.java`:
```java
import org.springframework.web.multipart.MultipartFile;
```

Add this method to `AdminController.java` (after `backupDatabase`, around line 120):

```java
@PostMapping("/restore")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public ApiResponse<Map<String, String>> restoreDatabase(
        @RequestParam("file") MultipartFile file,
        HttpServletRequest request) {
    if (file.isEmpty()) {
        throw new BadRequestException("请选择要还原的 SQL 文件");
    }
    String filename = file.getOriginalFilename();
    if (filename == null || !filename.endsWith(".sql")) {
        throw new BadRequestException("仅支持 .sql 格式的文件");
    }

    String username = (String) request.getAttribute("currentUsername");
    try {
        backupService.restoreDatabase(file.getInputStream());
        saveAuditLog(username, "RESTORE_DB", "从文件 " + filename + " 还原数据库", null);
        return ApiResponse.success("数据库已还原", Map.of("filename", filename));
    } catch (Exception e) {
        logger.error("数据库还原失败", e);
        throw new RuntimeException("数据库还原失败: " + e.getMessage(), e);
    }
}
```

- [ ] **Step 3: Run backend tests to make sure nothing broke**

Run: `cd backend && ./mvnw test --batch-mode`
Expected: Tests run: 110 (unchanged count from Task 2), BUILD SUCCESS

- [ ] **Step 4: Add adminRestoreDatabase to frontend API layer**

In `frontend/src/api/admin.ts`, after the `downloadBackup` function, add:

```typescript
export async function adminRestoreDatabase(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const resp = await http.post<ApiResponse<{ filename: string }>>('/admin/restore', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  if (resp.data.code !== 200) throw new Error(resp.data.message || '数据库还原失败')
  return resp.data.message
}
```

Ensure the import of `http` from `./http` and `ApiResponse` from `../types/api` are present (file already has `http` import on line 2).

- [ ] **Step 5: Add restore UI to SettingsView.vue**

In `SettingsView.vue` script, add imports and state:
```typescript
import { adminRestoreDatabase } from '../api/admin'
import ConfirmDialog from '../components/ConfirmDialog.vue'
// ... existing imports

const restoreFile = ref<File | null>(null)
const restorePending = ref(false)
const showRestoreConfirm = ref(false)
const restoreConfirmText = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

async function handleRestore() {
  if (!restoreFile.value) return
  restorePending.value = true
  try {
    const msg = await adminRestoreDatabase(restoreFile.value)
    alert(msg)
    window.location.reload()
  } catch (e: any) {
    alert(e.message || '数据库还原失败')
  } finally {
    restorePending.value = false
  }
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    restoreFile.value = input.files[0]
  }
}
```

In the template, after the existing backup card (`<!-- Data Backup Card -->` section, around line 222), add:

```html
<!-- Database Restore Card (SUPER_ADMIN only) -->
<div v-if="isSuperAdmin()" class="settings-card">
  <h3>数据库还原</h3>
  <p class="settings-card__desc">
    从备份文件还原数据库。此操作<strong>不可逆</strong>，将覆盖当前全部数据。
  </p>
  <div class="restore-controls">
    <input
      ref="fileInputRef"
      type="file"
      accept=".sql"
      @change="onFileSelected"
    />
    <button
      class="btn btn--danger"
      :disabled="!restoreFile || restorePending"
      @click="showRestoreConfirm = true"
    >
      {{ restorePending ? '还原中...' : '还原数据库' }}
    </button>
  </div>
</div>

<ConfirmDialog
  :modelValue="showRestoreConfirm"
  title="确认还原数据库"
  message="此操作不可逆，将覆盖当前全部数据。请确保已备份。"
  confirmLabel="确认还原"
  tone="danger"
  @confirm="showRestoreConfirm = false; handleRestore()"
  @cancel="showRestoreConfirm = false"
  @update:modelValue="(v: boolean) => { if (!v) showRestoreConfirm = false }"
/>
```

- [ ] **Step 6: Run frontend tests**

Run: `cd frontend && npx vitest run`
Expected: 85 passed (files with `admin.ts` import may need mock updates; if admin tests fail, add `adminRestoreDatabase` to the mock)

- [ ] **Step 7: Type check**

Run: `cd frontend && npx vue-tsc --noEmit`
Expected: PASS (0 errors)

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/service/BackupService.java \
        backend/src/main/java/com/genealogy/server/controller/AdminController.java \
        frontend/src/api/admin.ts \
        frontend/src/views/SettingsView.vue
git commit -m "feat: add database restore endpoint and UI"
```

---

### Task 4: Consistency Scan

**Files:**
- Create: `backend/src/main/java/com/genealogy/server/dto/ConsistencyReport.java`
- Create: `backend/src/main/java/com/genealogy/server/service/ConsistencyService.java`
- Modify: `backend/src/main/java/com/genealogy/server/controller/AdminController.java`
- Modify: `frontend/src/api/admin.ts`
- Modify: `frontend/src/views/SettingsView.vue`

- [ ] **Step 1: Create ConsistencyReport DTO**

```java
// backend/src/main/java/com/genealogy/server/dto/ConsistencyReport.java
package com.genealogy.server.dto;

import java.util.ArrayList;
import java.util.List;

public class ConsistencyReport {

    public static class Issue {
        public String type;
        public String personId;
        public String personName;
        public String detail;

        public Issue(String type, String personId, String personName, String detail) {
            this.type = type;
            this.personId = personId;
            this.personName = personName;
            this.detail = detail;
        }
    }

    private int totalIssues;
    private List<Issue> issues = new ArrayList<>();

    public int getTotalIssues() { return totalIssues; }
    public void setTotalIssues(int totalIssues) { this.totalIssues = totalIssues; }
    public List<Issue> getIssues() { return issues; }
    public void setIssues(List<Issue> issues) { this.issues = issues; }

    public void addIssue(String type, String personId, String personName, String detail) {
        issues.add(new Issue(type, personId, personName, detail));
    }
}
```

- [ ] **Step 2: Create ConsistencyService**

```java
// backend/src/main/java/com/genealogy/server/service/ConsistencyService.java
package com.genealogy.server.service;

import com.genealogy.server.dto.ConsistencyReport;
import com.genealogy.server.repository.*;
import com.genealogy.server.util.DateTextParser;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class ConsistencyService {

    private final JdbcTemplate jdbc;

    public ConsistencyService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public ConsistencyReport runCheck() {
        ConsistencyReport report = new ConsistencyReport();

        checkOrphanPersons(report);
        checkDateConflicts(report);
        checkLifeStatusConflicts(report);
        checkEmptyFamilies(report);

        report.setTotalIssues(report.getIssues().size());
        return report;
    }

    private void checkOrphanPersons(ConsistencyReport report) {
        String sql = """
            SELECT p.person_id, p.name FROM persons p
            WHERE p.publication_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM family_members fm WHERE fm.person_db_id = p.id
            )
            """;
        jdbc.query(sql, rs -> {
            report.addIssue("orphan", rs.getString("person_id"),
                rs.getString("name"), "该人物不属于任何家庭");
        });
    }

    private void checkDateConflicts(ConsistencyReport report) {
        String sql = "SELECT person_id, name, birth, death FROM persons WHERE birth IS NOT NULL AND death IS NOT NULL";
        jdbc.query(sql, rs -> {
            String personId = rs.getString("person_id");
            String name = rs.getString("name");
            String birth = rs.getString("birth");
            String death = rs.getString("death");
            var by = DateTextParser.extractYear(birth);
            var dy = DateTextParser.extractYear(death);
            if (by.isPresent() && dy.isPresent() && by.get() > dy.get()) {
                report.addIssue("date_conflict", personId, name,
                    "出生年份(" + by.get() + ")晚于去世年份(" + dy.get() + ")");
            }
        });
    }

    private void checkLifeStatusConflicts(ConsistencyReport report) {
        String sql = "SELECT person_id, name, deceased, death FROM persons WHERE deceased = false AND death IS NOT NULL AND death != ''";
        jdbc.query(sql, rs -> {
            report.addIssue("status_conflict", rs.getString("person_id"),
                rs.getString("name"), "标记为在世但有去世日期: " + rs.getString("death"));
        });
    }

    private void checkEmptyFamilies(ConsistencyReport report) {
        String sql = """
            SELECT f.family_id FROM families f
            WHERE NOT EXISTS (
                SELECT 1 FROM family_members fm WHERE fm.family_db_id = f.id
            )
            """;
        jdbc.query(sql, rs -> {
            report.addIssue("empty_family", "", "",
                "空家族: " + rs.getString("family_id"));
        });
    }
}
```

- [ ] **Step 3: Add consistency endpoint to AdminController**

Add `consistencyService` to the constructor of `AdminController`:
```java
private final ConsistencyService consistencyService;

public AdminController(..., ConsistencyService consistencyService) {
    // ... existing assignments
    this.consistencyService = consistencyService;
}
```

Add this method to `AdminController`:
```java
@GetMapping("/check-consistency")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public ApiResponse<ConsistencyReport> checkConsistency() {
    return ApiResponse.success(consistencyService.runCheck());
}
```

- [ ] **Step 4: Run backend tests**

Run: `cd backend && ./mvnw test --batch-mode`
Expected: Tests run: 110, BUILD SUCCESS (existing tests shouldn't break)

- [ ] **Step 5: Add adminCheckConsistency to frontend API layer**

In `frontend/src/api/admin.ts`, add the response type and function:

```typescript
export interface ConsistencyIssue {
  type: string
  personId: string
  personName: string
  detail: string
}

export interface ConsistencyReport {
  totalIssues: number
  issues: ConsistencyIssue[]
}

export async function adminCheckConsistency(): Promise<ConsistencyReport> {
  const resp = await http.get<ApiResponse<ConsistencyReport>>('/admin/check-consistency')
  if (resp.data.code !== 200) throw new Error(resp.data.message || '一致性检查失败')
  return resp.data.data
}
```

- [ ] **Step 6: Add consistency check UI to SettingsView.vue**

Add to script section:
```typescript
import { adminCheckConsistency, type ConsistencyIssue } from '../api/admin'

const consistencyResult = ref<ConsistencyIssue[]>([])
const consistencyRunning = ref(false)

async function handleConsistencyCheck() {
  consistencyRunning.value = true
  try {
    const report = await adminCheckConsistency()
    consistencyResult.value = report.issues
  } catch (e: any) {
    alert(e.message || '一致性检查失败')
  } finally {
    consistencyRunning.value = false
  }
}
```

Add to template (after restore card):
```html
<!-- Data Consistency Card (SUPER_ADMIN only) -->
<div v-if="isSuperAdmin()" class="settings-card">
  <h3>数据一致性检查</h3>
  <p class="settings-card__desc">扫描全库数据，检测孤立人物、日期矛盾、状态不一致等问题。</p>
  <button
    class="btn btn--secondary"
    :disabled="consistencyRunning"
    @click="handleConsistencyCheck"
  >
    {{ consistencyRunning ? '检查中...' : '开始检查' }}
  </button>

  <div v-if="consistencyResult.length" class="consistency-report">
    <p class="consistency-summary">发现 {{ consistencyResult.length }} 个问题：</p>
    <details v-for="(group, type) in groupedIssues" :key="type" class="consistency-group">
      <summary>{{ typeLabels[type] || type }} ({{ group.length }})</summary>
      <ul>
        <li v-for="issue in group" :key="issue.personId + issue.detail">
          <strong>{{ issue.personName || issue.personId }}</strong>
          — {{ issue.detail }}
        </li>
      </ul>
    </details>
  </div>
  <p v-else-if="consistencyResult.length === 0 && !consistencyRunning" class="consistency-clean">
    未发现问题，数据一致性良好。
  </p>
</div>
```

Add computed property for grouping:
```typescript
const groupedIssues = computed(() => {
  const groups: Record<string, ConsistencyIssue[]> = {}
  for (const issue of consistencyResult.value) {
    if (!groups[issue.type]) groups[issue.type] = []
    groups[issue.type].push(issue)
  }
  return groups
})

const typeLabels: Record<string, string> = {
  orphan: '孤立人物',
  date_conflict: '生卒日期矛盾',
  status_conflict: '在世状态矛盾',
  empty_family: '空家族',
}
```

- [ ] **Step 7: Run frontend tests and type check**

Run: `cd frontend && npx vitest run`
Expected: 85 passed

Run: `cd frontend && npx vue-tsc --noEmit`
Expected: PASS

- [ ] **Step 8: Final full test suite**

Run: `cd backend && ./mvnw test --batch-mode`
Expected: All tests pass, BUILD SUCCESS

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/dto/ConsistencyReport.java \
        backend/src/main/java/com/genealogy/server/service/ConsistencyService.java \
        backend/src/main/java/com/genealogy/server/controller/AdminController.java \
        frontend/src/api/admin.ts \
        frontend/src/views/SettingsView.vue
git commit -m "feat: add data consistency scan endpoint and UI"
```
