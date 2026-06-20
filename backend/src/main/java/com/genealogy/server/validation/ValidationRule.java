package com.genealogy.server.validation;

import java.util.List;

/**
 * 校验规则接口
 *
 * 每条规则负责检查族谱数据的某一个维度，
 * 返回零到多条 ValidationFinding。
 */
public interface ValidationRule {

    /** 规则 ID，如 "GEN_001" */
    String ruleId();

    /** 默认严重级别 */
    ValidationSeverity severity();

    /** 规则说明（供 UI 展示） */
    String description();

    /**
     * 执行校验
     *
     * @param graph 族谱关系图（包含所有人物和家庭的关系）
     * @return 该校验发现的问题列表（可能为空）
     */
    List<ValidationFinding> validate(GenealogyGraph graph);
}
