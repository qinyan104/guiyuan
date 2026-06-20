package com.genealogy.server.validation.rules;

import com.genealogy.server.util.DateTextParser;
import com.genealogy.server.validation.*;
import com.genealogy.server.types.Person;
import java.time.Year;
import java.util.*;

/**
 * GEN_009: 未来日期检测
 * 出生/去世日期在当前年份之后
 */
public class FutureDateRule implements ValidationRule {
    @Override public String ruleId() { return "GEN_009"; }
    @Override public ValidationSeverity severity() { return ValidationSeverity.ERROR; }
    @Override public String description() { return "未来日期检测（出生/去世年份不应在未来）"; }

    @Override
    public List<ValidationFinding> validate(GenealogyGraph graph) {
        List<ValidationFinding> findings = new ArrayList<>();
        int currentYear = Year.now().getValue();

        for (Person p : graph.getAllPersons()) {
            var birthYear = DateTextParser.extractYear(p.birth());
            if (birthYear.isPresent() && birthYear.get() > currentYear) {
                findings.add(new ValidationFinding(ValidationSeverity.ERROR, ruleId(),
                    p.id(), null,
                    String.format("人物「%s」的出生年份 %d 在当前年份 %d 之后", p.name(), birthYear.get(), currentYear),
                    "请修正出生年份"));
            }
            var deathYear = DateTextParser.extractYear(p.death());
            if (deathYear.isPresent() && deathYear.get() > currentYear) {
                findings.add(new ValidationFinding(ValidationSeverity.ERROR, ruleId(),
                    p.id(), null,
                    String.format("人物「%s」的去世年份 %d 在当前年份 %d 之后", p.name(), deathYear.get(), currentYear),
                    "请修正去世年份"));
            }
        }
        return findings;
    }
}
