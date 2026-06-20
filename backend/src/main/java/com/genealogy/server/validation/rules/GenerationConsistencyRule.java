package com.genealogy.server.validation.rules;

import com.genealogy.server.validation.*;
import com.genealogy.server.types.Person;

import java.util.*;

/**
 * GEN_005: 世代一致性检查
 * 同一家庭的子女应处于相近世代（相差不超过 1）
 */
public class GenerationConsistencyRule implements ValidationRule {
    @Override public String ruleId() { return "GEN_005"; }
    @Override public ValidationSeverity severity() { return ValidationSeverity.WARNING; }
    @Override public String description() { return "世代一致性检查（同家庭子女世代差 ≤1）"; }

    @Override
    public List<ValidationFinding> validate(GenealogyGraph graph) {
        List<ValidationFinding> findings = new ArrayList<>();
        for (var fam : graph.getAllFamilies()) {
            List<String> childrenIds = fam.children();
            if (childrenIds.size() < 2) continue;

            int minGen = Integer.MAX_VALUE, maxGen = Integer.MIN_VALUE;
            String minName = null, maxName = null;
            for (String cid : childrenIds) {
                int gen = graph.getGeneration(cid);
                if (gen < minGen) { minGen = gen; minName = graph.getPerson(cid) != null ? graph.getPerson(cid).name() : cid; }
                if (gen > maxGen) { maxGen = gen; maxName = graph.getPerson(cid) != null ? graph.getPerson(cid).name() : cid; }
            }
            if (maxGen - minGen > 1) {
                findings.add(new ValidationFinding(ValidationSeverity.WARNING, ruleId(),
                    null, fam.id(),
                    String.format("家庭 %s 的子女世代跨度异常：%s（第 %d 代）与 %s（第 %d 代）相差 %d 代",
                        fam.id(), minName, minGen, maxName, maxGen, maxGen - minGen),
                    "请检查是否有辈分录入错误"));
            }
        }
        return findings;
    }
}
