package com.genealogy.server.validation.rules;

import com.genealogy.server.util.DateTextParser;
import com.genealogy.server.validation.*;
import com.genealogy.server.types.FamilyUnit;
import com.genealogy.server.types.Person;

import java.util.*;

/**
 * GEN_002: 子女出生年份顺序检查
 * 同一家庭的子女出生年应大致递增
 */
public class BirthOrderRule implements ValidationRule {
    @Override public String ruleId() { return "GEN_002"; }
    @Override public ValidationSeverity severity() { return ValidationSeverity.INFO; }
    @Override public String description() { return "子女出生年份顺序检查"; }

    @Override
    public List<ValidationFinding> validate(GenealogyGraph graph) {
        List<ValidationFinding> findings = new ArrayList<>();
        for (FamilyUnit fam : graph.getAllFamilies()) {
            List<String> childrenIds = fam.children();
            if (childrenIds.size() < 2) continue;

            Integer prevYear = null;
            String prevChildName = null;
            for (String childId : childrenIds) {
                Person child = graph.getPerson(childId);
                if (child == null) continue;
                var year = DateTextParser.extractYear(child.birth());
                if (year.isEmpty() || prevYear == null) {
                    if (year.isPresent()) prevYear = year.get();
                    prevChildName = child.name();
                    continue;
                }
                if (year.get() < prevYear) {
                    findings.add(new ValidationFinding(ValidationSeverity.INFO, ruleId(),
                        child.id(), fam.id(),
                        String.format("人物「%s」（%d 年）的出生年份早于其兄/姐「%s」（%d 年），请确认排行顺序",
                            child.name(), year.get(), prevChildName, prevYear),
                        "如排行无误可忽略此提示"));
                }
                prevYear = year.get();
                prevChildName = child.name();
            }
        }
        return findings;
    }
}
