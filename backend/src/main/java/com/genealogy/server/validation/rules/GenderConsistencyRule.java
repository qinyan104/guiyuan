package com.genealogy.server.validation.rules;

import com.genealogy.server.validation.*;
import com.genealogy.server.types.Person;
import java.util.*;

/**
 * GEN_008: 性别一致性检查
 * 同性配偶家庭（可能是录入错误，也可能是真实情况）
 */
public class GenderConsistencyRule implements ValidationRule {
    @Override public String ruleId() { return "GEN_008"; }
    @Override public ValidationSeverity severity() { return ValidationSeverity.INFO; }
    @Override public String description() { return "性别一致性检查（同性配偶）"; }

    @Override
    public List<ValidationFinding> validate(GenealogyGraph graph) {
        List<ValidationFinding> findings = new ArrayList<>();
        Set<String> checked = new HashSet<>();
        for (Person p : graph.getAllPersons()) {
            for (Person spouse : graph.getSpouses(p.id())) {
                String pairKey = p.id().compareTo(spouse.id()) < 0
                    ? p.id() + ":" + spouse.id()
                    : spouse.id() + ":" + p.id();
                if (!checked.add(pairKey)) continue;

                if (p.gender() != null && spouse.gender() != null
                    && !p.gender().equals("unknown") && !spouse.gender().equals("unknown")
                    && p.gender().equals(spouse.gender())) {
                    findings.add(new ValidationFinding(ValidationSeverity.INFO, ruleId(),
                        p.id(), null,
                        String.format("配偶「%s」与「%s」性别相同（%s），请确认",
                            p.name(), spouse.name(), p.gender()),
                        "如为入赘等情况可忽略"));
                }
            }
        }
        return findings;
    }
}
