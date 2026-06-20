package com.genealogy.server.validation.rules;

import com.genealogy.server.util.DateTextParser;
import com.genealogy.server.validation.*;
import com.genealogy.server.types.Person;

import java.util.*;

/**
 * GEN_004: 重复人物检测
 * 姓名完全相同 + 出生年接近（±2 年）的人物可能是重复录入
 */
public class DuplicatePersonRule implements ValidationRule {
    @Override public String ruleId() { return "GEN_004"; }
    @Override public ValidationSeverity severity() { return ValidationSeverity.WARNING; }
    @Override public String description() { return "重复人物检测（同名+出生年接近）"; }

    @Override
    public List<ValidationFinding> validate(GenealogyGraph graph) {
        List<ValidationFinding> findings = new ArrayList<>();
        List<Person> all = new ArrayList<>(graph.getAllPersons());

        for (int i = 0; i < all.size(); i++) {
            Person a = all.get(i);
            if (a.name() == null || a.name().isBlank()) continue;
            var yearA = DateTextParser.extractYear(a.birth());

            for (int j = i + 1; j < all.size(); j++) {
                Person b = all.get(j);
                if (b.name() == null || !a.name().equals(b.name())) continue;

                var yearB = DateTextParser.extractYear(b.birth());
                if (yearA.isPresent() && yearB.isPresent()) {
                    int diff = Math.abs(yearA.get() - yearB.get());
                    if (diff <= 2) {
                        findings.add(new ValidationFinding(ValidationSeverity.WARNING, ruleId(),
                            a.id(), null,
                            String.format("人物「%s」（%s）与「%s」（%s）姓名相同且出生年接近，可能重复",
                                a.name(), a.id(), b.name(), b.id()),
                            "请确认是否为同一人，如是请合并"));
                    }
                } else if (yearA.isEmpty() && yearB.isEmpty()) {
                    // 两个都没有出生年，只靠名字判断——可能是同一个人
                    findings.add(new ValidationFinding(ValidationSeverity.INFO, ruleId(),
                        a.id(), null,
                        String.format("人物「%s」（%s）与「%s」（%s）姓名相同，无出生年份对比，请人工确认",
                            a.name(), a.id(), b.name(), b.id()),
                        "请确认是否为同一人"));
                }
            }
        }
        return findings;
    }
}
