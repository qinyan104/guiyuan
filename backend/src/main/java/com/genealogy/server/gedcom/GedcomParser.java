package com.genealogy.server.gedcom;

import com.genealogy.server.gedcom.GedcomRecord.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * GEDCOM 5.5 解析器 — 状态机逐行解析
 *
 * 设计要点：
 * 1. 流式逐行解析，不将整个文件加载到内存（支持大文件）
 * 2. 容错处理：跳过未知标签、容忍格式偏差
 * 3. 编码自适应：检测 BOM / CHARSET 声明，回退 UTF-8
 */
public class GedcomParser {

    private static final Logger log = LoggerFactory.getLogger(GedcomParser.class);

    /**
     * 从输入流解析 GEDCOM 文本
     */
    public ParseResult parse(InputStream input) throws IOException {
        ParseResult result = new ParseResult();

        BufferedInputStream bis = new BufferedInputStream(input, 8192);
        Charset charset = detectCharset(bis);
        BufferedReader reader = new BufferedReader(new InputStreamReader(bis, charset), 8192);

        PersonBuilder currentPerson = null;
        FamilyBuilder currentFamily = null;

        // 追踪 level-1 上下文（BIRT/DEAT 需要区分其子标签 DATE/PLAC 属于哪个父标签）
        String level1Context = null; // "BIRT" / "DEAT" / null

        // 追踪上一个需要多行拼接的 StringBuilder
        StringBuilder continuationTarget = null;

        String line;
        int lineNum = 0;

        while ((line = reader.readLine()) != null) {
            lineNum++;
            line = line.trim();
            if (line.isEmpty()) continue;

            GedcomLine parsed;
            try {
                parsed = parseLine(line, lineNum);
            } catch (GedcomParseException e) {
                result.warnings().add("行 " + lineNum + ": " + e.getMessage());
                continue;
            }
            if (parsed == null) continue;

            int level = parsed.level;

            // CONT/CONC 处理：拼接多行文本到上一个标签的值
            if ("CONT".equals(parsed.tag) || "CONC".equals(parsed.tag)) {
                if (continuationTarget != null) {
                    String val = parsed.value != null ? parsed.value : "";
                    if ("CONT".equals(parsed.tag)) {
                        continuationTarget.append("\n").append(val);
                    } else {
                        continuationTarget.append(val);
                    }
                }
                continue;
            }
            continuationTarget = null;

            // Level 0: 新的顶层记录
            if (level == 0) {
                // 保存前一个记录
                if (currentPerson != null) result.persons().add(currentPerson.build());
                if (currentFamily != null) result.families().add(currentFamily.build());
                currentPerson = null;
                currentFamily = null;
                level1Context = null;

                if ("HEAD".equals(parsed.tag) || "TRLR".equals(parsed.tag)) {
                    if ("TRLR".equals(parsed.tag)) break;
                    continue;
                }

                if ("INDI".equals(parsed.tag) && parsed.id != null) {
                    currentPerson = new PersonBuilder();
                    currentPerson.id = parsed.id;
                } else if ("FAM".equals(parsed.tag) && parsed.id != null) {
                    currentFamily = new FamilyBuilder();
                    currentFamily.id = parsed.id;
                }
                continue;
            }

            // Level 1: 记录上下文
            if (level == 1) {
                level1Context = null; // 重置
            }

            // 处理 INDI 子标签
            if (currentPerson != null) {
                continuationTarget = applyPersonTag(currentPerson, parsed, level1Context);
                if (level == 1) {
                    level1Context = parsed.tag; // 记录 level-1 标签
                }
                continue;
            }

            // 处理 FAM 子标签
            if (currentFamily != null) {
                continuationTarget = applyFamilyTag(currentFamily, parsed);
                continue;
            }
        }

        // 保存最后一个记录
        if (currentPerson != null) result.persons().add(currentPerson.build());
        if (currentFamily != null) result.families().add(currentFamily.build());

        log.info("GEDCOM 解析完成: {} 个人物, {} 个家庭, {} 条警告",
            result.persons().size(), result.families().size(), result.warnings().size());

        return result;
    }

    /**
     * 自动检测字符编码
     * 优先级：BOM > GEDCOM HEAD 中的 CHAR 标签 > 默认 UTF-8
     */
    private Charset detectCharset(BufferedInputStream bis) throws IOException {
        bis.mark(8192);
        byte[] bomBuf = new byte[3];
        int bytesRead = 0;
        int b;
        while (bytesRead < 3 && (b = bis.read()) != -1) {
            bomBuf[bytesRead++] = (byte) b;
        }

        if (bytesRead >= 3 && (bomBuf[0] & 0xFF) == 0xEF && (bomBuf[1] & 0xFF) == 0xBB && (bomBuf[2] & 0xFF) == 0xBF) {
            bis.reset(); bis.skip(3);
            return StandardCharsets.UTF_8;
        }
        if (bytesRead >= 2 && (bomBuf[0] & 0xFF) == 0xFF && (bomBuf[1] & 0xFF) == 0xFE) {
            bis.reset(); bis.skip(2);
            return StandardCharsets.UTF_16LE;
        }
        if (bytesRead >= 2 && (bomBuf[0] & 0xFF) == 0xFE && (bomBuf[1] & 0xFF) == 0xFF) {
            bis.reset(); bis.skip(2);
            return StandardCharsets.UTF_16BE;
        }

        bis.reset();
        byte[] buf = new byte[4096];
        int len = bis.read(buf);
        bis.reset();

        if (len > 0) {
            String head = new String(buf, 0, Math.min(len, 4096), StandardCharsets.US_ASCII);
            int charIdx = head.indexOf("CHAR ");
            if (charIdx >= 0) {
                int valueStart = charIdx + 5;
                int valueEnd = head.indexOf('\n', valueStart);
                if (valueEnd < 0) valueEnd = head.indexOf('\r', valueStart);
                if (valueEnd < 0) valueEnd = Math.min(valueStart + 20, head.length());
                String charsetValue = head.substring(valueStart, valueEnd).trim().toUpperCase();
                return switch (charsetValue) {
                    case "UTF-8", "UTF8" -> StandardCharsets.UTF_8;
                    case "ASCII" -> StandardCharsets.US_ASCII;
                    default -> StandardCharsets.UTF_8;
                };
            }
        }
        return StandardCharsets.UTF_8;
    }

    /**
     * 解析一行 GEDCOM 文本：LEVEL [ID] TAG [VALUE]
     */
    private GedcomLine parseLine(String line, int lineNum) throws GedcomParseException {
        if (line.startsWith("//") || line.startsWith("#")) return null;
        String[] parts = line.split("\\s+", 4);
        if (parts.length < 2) return null;

        int level;
        try {
            level = Integer.parseInt(parts[0]);
        } catch (NumberFormatException e) {
            throw new GedcomParseException("无效的层级号: " + parts[0]);
        }

        String id = null;
        String tag;
        String value = null;

        if (parts.length >= 3 && parts[1].startsWith("@") && parts[1].endsWith("@")) {
            id = parts[1];
            tag = parts[2];
            if (parts.length >= 4) value = parts[3];
        } else {
            tag = parts[1];
            if (parts.length >= 3) {
                value = parts.length >= 4 ? parts[2] + " " + parts[3] : parts[2];
            }
        }

        return new GedcomLine(level, id, tag, value);
    }

    /**
     * 将 level-1 标签应用到正在构建的人物记录
     * @param level1Context 当前 level-1 标签（用于 level-2 子标签的上下文判断）
     * @return 如果需要多行拼接，返回对应的 StringBuilder
     */
    private StringBuilder applyPersonTag(PersonBuilder person, GedcomLine line, String level1Context) {
        String tag = line.tag;
        String value = line.value;

        if (line.level == 1) {
            return switch (tag) {
                case "NAME" -> {
                    person.name = cleanName(value);
                    yield null;
                }
                case "SEX" -> {
                    if (value != null) {
                        person.sex = switch (value.trim().toUpperCase()) {
                            case "M" -> "M";
                            case "F" -> "F";
                            default -> "U";
                        };
                    }
                    yield null;
                }
                case "BIRT" -> null; // level-2 子标签在下一轮处理
                case "DEAT" -> {
                    person.deceased = true;
                    yield null;
                }
                case "NOTE" -> {
                    person.note = value;
                    person.noteBuilder = (value != null) ? new StringBuilder(value) : null;
                    yield person.noteBuilder;
                }
                case "TITL" -> {
                    person.titleName = value;
                    yield null;
                }
                case "_CLAN" -> {
                    person.clan = value;
                    yield null;
                }
                case "FAMS" -> {
                    if (value != null) person.familySpouseIds.add(value.trim());
                    yield null;
                }
                case "FAMC" -> {
                    if (value != null) person.familyChildIds.add(value.trim());
                    yield null;
                }
                default -> null;
            };
        }

        // Level 2: BIRT/DEAT 的子标签
        if (line.level == 2 && level1Context != null) {
            if ("BIRT".equals(level1Context)) {
                switch (tag) {
                    case "DATE" -> person.birthDate = value;
                    case "PLAC" -> person.birthPlace = value;
                }
            } else if ("DEAT".equals(level1Context)) {
                switch (tag) {
                    case "DATE" -> person.deathDate = value;
                    case "PLAC" -> person.deathPlace = value;
                }
            }
        }

        return null;
    }

    /**
     * 将标签应用到正在构建的家庭记录
     */
    private StringBuilder applyFamilyTag(FamilyBuilder family, GedcomLine line) {
        if (line.level != 1) return null;

        return switch (line.tag) {
            case "HUSB" -> {
                family.husbandId = line.value != null ? line.value.trim() : null;
                yield null;
            }
            case "WIFE" -> {
                family.wifeId = line.value != null ? line.value.trim() : null;
                yield null;
            }
            case "CHIL" -> {
                if (line.value != null) family.childrenIds.add(line.value.trim());
                yield null;
            }
            case "NOTE" -> {
                family.note = line.value;
                yield (line.value != null) ? new StringBuilder(line.value) : null;
            }
            default -> null;
        };
    }

    /**
     * 清理 GEDCOM 姓名
     * GEDCOM 格式：Given /Surname/ → 取消斜杠，中文名直接使用
     */
    private String cleanName(String rawName) {
        if (rawName == null) return null;
        String name = rawName.trim().replaceAll("/", "").replaceAll("\\s+", " ").trim();
        return name.isEmpty() ? null : name;
    }

    private record GedcomLine(int level, String id, String tag, String value) {}

    private static class GedcomParseException extends Exception {
        GedcomParseException(String message) { super(message); }
    }
}
