package com.genealogy.server.validation;

import com.genealogy.server.service.PublicationService;
import com.genealogy.server.types.PublicationData;
import com.genealogy.server.validation.rules.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 智能校验引擎
 *
 * 遍历所有注册的 ValidationRule，返回按严重级别排序的校验发现。
 * 所有规则以 advisory 模式运行——不阻止保存，只提供建议。
 */
@Service
public class GenealogyValidationEngine {

    private static final Logger log = LoggerFactory.getLogger(GenealogyValidationEngine.class);

    private final List<ValidationRule> rules;
    private final PublicationService publicationService;

    public GenealogyValidationEngine(PublicationService publicationService) {
        this.publicationService = publicationService;
        this.rules = List.of(
            new FutureDateRule(),           // GEN_009 ERROR
            new AgeGapRule(),               // GEN_001 WARNING
            new DuplicatePersonRule(),      // GEN_004 WARNING
            new GenerationConsistencyRule(),// GEN_005 WARNING
            new BirthOrderRule(),           // GEN_002 INFO
            new SpouseAgeGapRule(),         // GEN_003 INFO
            new OrphanBranchRule(),         // GEN_006 INFO
            new NameQualityRule(),          // GEN_007 INFO
            new GenderConsistencyRule(),    // GEN_008 INFO
            new ExtremeAgeRule()            // GEN_010 INFO
        );
    }

    /**
     * 运行所有校验规则
     *
     * @param pubId 族谱 ID
     * @return 校验发现列表，按严重级别排序（ERROR > WARNING > INFO）
     */
    public List<ValidationFinding> validate(Long pubId) {
        Map<String, Object> data = publicationService.loadPublication(pubId);
        @SuppressWarnings("unchecked")
        Map<String, Object> pubJson = (Map<String, Object>) data.get("publication");
        PublicationData pubData = PublicationData.fromMap(pubJson);
        GenealogyGraph graph = GenealogyGraph.from(pubData);

        List<ValidationFinding> allFindings = new ArrayList<>();
        for (ValidationRule rule : rules) {
            try {
                allFindings.addAll(rule.validate(graph));
            } catch (Exception e) {
                log.warn("校验规则 {} 执行失败: {}", rule.ruleId(), e.getMessage(), e);
                allFindings.add(new ValidationFinding(
                    ValidationSeverity.INFO, rule.ruleId(), null, null,
                    "规则执行异常: " + e.getMessage(), null));
            }
        }

        // 按严重级别排序：ERROR > WARNING > INFO
        allFindings.sort(Comparator.comparingInt(f -> f.severity().ordinal()));
        return allFindings;
    }

    /**
     * 实时校验（单人更新时）
     * 只运行与该人物直接相关的规则，性能更好
     */
    public List<ValidationFinding> validatePerson(Long pubId, String personId) {
        // 全量校验然后过滤——简单但对 <5000 人的族谱足够快
        // 后续可优化为只加载相关子图
        return validate(pubId).stream()
            .filter(f -> personId.equals(f.personId()) || f.personId() == null)
            .toList();
    }

    /**
     * 获取校验统计摘要
     */
    public Map<String, Object> getSummary(Long pubId) {
        List<ValidationFinding> findings = validate(pubId);
        long errors = findings.stream().filter(f -> f.severity() == ValidationSeverity.ERROR).count();
        long warnings = findings.stream().filter(f -> f.severity() == ValidationSeverity.WARNING).count();
        long infos = findings.stream().filter(f -> f.severity() == ValidationSeverity.INFO).count();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("errors", errors);
        summary.put("warnings", warnings);
        summary.put("infos", infos);
        summary.put("total", findings.size());
        return summary;
    }

    /** 获取所有已注册规则的元信息 */
    public List<Map<String, Object>> listRules() {
        return rules.stream().map(rule -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ruleId", rule.ruleId());
            m.put("severity", rule.severity().name());
            m.put("description", rule.description());
            return m;
        }).toList();
    }
}
