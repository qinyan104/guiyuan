package com.genealogy.server.validation;

/**
 * 校验发现 — 一条校验规则产出的问题描述
 */
public record ValidationFinding(
    ValidationSeverity severity,
    String ruleId,        // 如 "GEN_001"
    String personId,      // 相关人物（可为 null）
    String familyId,      // 相关家庭（可为 null）
    String message,       // 人类可读的描述
    String suggestion     // 修复建议（可为 null）
) {}
