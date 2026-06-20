package com.genealogy.server.validation.rules;

import com.genealogy.server.util.DateTextParser;
import com.genealogy.server.validation.*;
import com.genealogy.server.types.Person;
import java.time.Year;
import java.util.*;

/**
 * GEN_010: 高龄在世检测
 * 标记为在世但年龄 > 120 岁
 */
public class ExtremeAgeRule implements ValidationRule {
    private static final int MAX_AGE = 120;

    @Override public String ruleId() { return "GEN_010"; }
    @Override public ValidationSeverity severity() { return ValidationSeverity.INFO; }
    @Override public String description() { return "高龄在世检测（年龄 > 120 岁）"; }

    @Override
    public List<ValidationFinding> validate(GenealogyGraph graph) {
        List<ValidationFinding> findings = new ArrayList<>();
        int currentYear = Year.now().getValue();

        for (Person p : graph.getAllPersons()) {
            if (Boolean.TRUE.equals(p.deceased())) continue;

            var birthYear = DateTextParser.extractYear(p.birth());
            if (birthYear.isPresent()) {
                int age = currentYear - birthYear.get();
                if (age > MAX_AGE) {
                    findings.add(new ValidationFinding(ValidationSeverity.INFO, ruleId(),
                        p.id(), null,
                        String.format("人物「%s」标记为在世，但按出生年 %d 计算已 %d 岁",
                            p.name(), birthYear.get(), age),
                        "请确认是否已故，或出生年份有误"));
                }
            }
        }
        return findings;
    }
}
