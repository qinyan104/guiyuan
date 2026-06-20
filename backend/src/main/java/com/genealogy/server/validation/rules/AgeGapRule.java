package com.genealogy.server.validation.rules;

import com.genealogy.server.util.DateTextParser;
import com.genealogy.server.validation.*;
import com.genealogy.server.types.FamilyUnit;
import com.genealogy.server.types.Person;

import java.util.*;

/**
 * GEN_001: 父母-子女年龄差检查
 * 父母出生年应比子女早 15-60 年
 */
public class AgeGapRule implements ValidationRule {
    private static final int MIN_AGE = 15;
    private static final int MAX_AGE = 60;

    @Override public String ruleId() { return "GEN_001"; }
    @Override public ValidationSeverity severity() { return ValidationSeverity.WARNING; }
    @Override public String description() { return "父母-子女年龄差检查（15-60 年）"; }

    @Override
    public List<ValidationFinding> validate(GenealogyGraph graph) {
        List<ValidationFinding> findings = new ArrayList<>();
        for (FamilyUnit fam : graph.getAllFamilies()) {
            List<Person> adults = fam.adults().stream().map(graph::getPerson).filter(Objects::nonNull).toList();
            List<Person> children = fam.children().stream().map(graph::getPerson).filter(Objects::nonNull).toList();
            for (Person adult : adults) {
                var adultYear = DateTextParser.extractYear(adult.birth());
                if (adultYear.isEmpty()) continue;
                for (Person child : children) {
                    var childYear = DateTextParser.extractYear(child.birth());
                    if (childYear.isEmpty()) continue;
                    int gap = childYear.get() - adultYear.get();
                    if (gap < MIN_AGE) {
                        findings.add(new ValidationFinding(ValidationSeverity.WARNING, ruleId(),
                            child.id(), fam.id(),
                            String.format("人物「%s」出生时其父母「%s」年仅 %d 岁（%d→%d），请确认",
                                child.name(), adult.name(), gap, adultYear.get(), childYear.get()),
                            "请核实出生年份是否正确"));
                    } else if (gap > MAX_AGE) {
                        findings.add(new ValidationFinding(ValidationSeverity.INFO, ruleId(),
                            child.id(), fam.id(),
                            String.format("人物「%s」出生时其父母「%s」已 %d 岁（%d→%d），年龄差较大",
                                child.name(), adult.name(), gap, adultYear.get(), childYear.get()),
                            "如为过继/兼祧关系，可在备注中说明"));
                    }
                }
            }
        }
        return findings;
    }
}
