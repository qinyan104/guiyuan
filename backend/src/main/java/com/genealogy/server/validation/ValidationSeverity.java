package com.genealogy.server.validation;

public enum ValidationSeverity {
    ERROR,   // 数据逻辑错误，必须修复
    WARNING, // 高度可疑，强烈建议修复
    INFO     // 可能的问题，建议人工确认
}
