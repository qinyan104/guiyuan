package com.genealogy.server.validation.rules;

import com.genealogy.server.validation.*;
import java.util.*;

/**
 * GEN_006: 孤立分支检测
 * 与主树无连接的独立家庭组（不含挂载点）
 */
public class OrphanBranchRule implements ValidationRule {
    @Override public String ruleId() { return "GEN_006"; }
    @Override public ValidationSeverity severity() { return ValidationSeverity.INFO; }
    @Override public String description() { return "孤立分支检测（与主树无连接）"; }

    @Override
    public List<ValidationFinding> validate(GenealogyGraph graph) {
        List<ValidationFinding> findings = new ArrayList<>();
        List<Set<String>> components = graph.getConnectedComponents();
        if (components.size() <= 1) return findings;

        // 找出最大的连通分量（主树）
        Set<String> largest = components.stream()
            .max(Comparator.comparingInt(Set::size))
            .orElse(Set.of());

        for (Set<String> component : components) {
            if (component == largest) continue;
            if (component.size() <= 1) {
                // 单人孤立——已在其他规则（孤儿人物）中检查
                continue;
            }
            String samplePerson = component.iterator().next();
            String sampleName = graph.getPerson(samplePerson) != null ? graph.getPerson(samplePerson).name() : samplePerson;
            findings.add(new ValidationFinding(ValidationSeverity.INFO, ruleId(),
                samplePerson, null,
                String.format("发现孤立分支：%d 个人物（如「%s」等）与主树无连接",
                    component.size(), sampleName),
                "请确认是否需要将此分支挂接到主树"));
        }
        return findings;
    }
}
