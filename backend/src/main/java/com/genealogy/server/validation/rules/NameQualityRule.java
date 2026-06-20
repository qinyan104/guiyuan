package com.genealogy.server.validation.rules;

import com.genealogy.server.validation.*;
import com.genealogy.server.types.Person;
import java.util.*;

/**
 * GEN_007: 姓名规范检查
 * 姓名为空、包含特殊字符、长度异常
 */
public class NameQualityRule implements ValidationRule {
    @Override public String ruleId() { return "GEN_007"; }
    @Override public ValidationSeverity severity() { return ValidationSeverity.INFO; }
    @Override public String description() { return "姓名规范检查（空名/特殊字符/长度异常）"; }

    @Override
    public List<ValidationFinding> validate(GenealogyGraph graph) {
        List<ValidationFinding> findings = new ArrayList<>();
        for (Person p : graph.getAllPersons()) {
            if (p.name() == null || p.name().isBlank()) {
                findings.add(new ValidationFinding(ValidationSeverity.WARNING, ruleId(),
                    p.id(), null,
                    String.format("人物 %s 缺少姓名", p.id()),
                    "请补充姓名"));
                continue;
            }
            String name = p.name().trim();
            if (name.length() > 20) {
                findings.add(new ValidationFinding(ValidationSeverity.INFO, ruleId(),
                    p.id(), null,
                    String.format("人物「%s」姓名长度异常（%d 字符），可能包含备注信息", name, name.length()),
                    "姓名字段应只包含姓名"));
            }
            // 检查是否包含明显非姓名字符（括号、数字等）
            if (name.matches(".*[\\d()（）\\[\\]【】{}].*")) {
                findings.add(new ValidationFinding(ValidationSeverity.INFO, ruleId(),
                    p.id(), null,
                    String.format("人物「%s」姓名中包含数字或括号等特殊字符", name),
                    "请确认姓名是否正确，备注信息应写在 note 字段"));
            }
        }
        return findings;
    }
}
