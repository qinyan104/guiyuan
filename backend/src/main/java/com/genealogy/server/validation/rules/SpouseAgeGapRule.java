package com.genealogy.server.validation.rules;

import com.genealogy.server.util.DateTextParser;
import com.genealogy.server.validation.*;
import com.genealogy.server.types.Person;

import java.util.*;

/**
 * GEN_003: 配偶年龄差检查
 * 配偶年龄差通常 < 20 年
 */
public class SpouseAgeGapRule implements ValidationRule {
    @Override public String ruleId() { return "GEN_003"; }
    @Override public ValidationSeverity severity() { return ValidationSeverity.INFO; }
    @Override public String description() { return "配偶年龄差检查（<20 年）"; }

    @Override
    public List<ValidationFinding> validate(GenealogyGraph graph) {
        List<ValidationFinding> findings = new ArrayList<>();
        Set<String> checked = new HashSet<>();
        for (Person person : graph.getAllPersons()) {
            for (Person spouse : graph.getSpouses(person.id())) {
                String pairKey = person.id().compareTo(spouse.id()) < 0
                    ? person.id() + ":" + spouse.id()
                    : spouse.id() + ":" + person.id();
                if (!checked.add(pairKey)) continue;

                var y1 = DateTextParser.extractYear(person.birth());
                var y2 = DateTextParser.extractYear(spouse.birth());
                if (y1.isEmpty() || y2.isEmpty()) continue;
                int gap = Math.abs(y1.get() - y2.get());
                if (gap > 20) {
                    findings.add(new ValidationFinding(ValidationSeverity.INFO, ruleId(),
                        person.id(), null,
                        String.format("配偶「%s」与「%s」年龄差 %d 年（%d vs %d），差距较大",
                            person.name(), spouse.name(), gap, y1.get(), y2.get()),
                        "如为续弦等情况可忽略"));
                }
            }
        }
        return findings;
    }
}
