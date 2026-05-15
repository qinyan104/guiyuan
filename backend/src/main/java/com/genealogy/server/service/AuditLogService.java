package com.genealogy.server.service;

import com.genealogy.server.model.AuditLog;
import com.genealogy.server.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void record(String username, String action, String detail, String targetType, Long targetId) {
        AuditLog log = new AuditLog();
        log.setUsername(username);
        log.setAction(action);
        log.setDetail(detail);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        auditLogRepository.save(log);
    }

    public void record(String username, String action, String detail, Long targetId) {
        record(username, action, detail, "publication", targetId);
    }

    public void record(String username, String action, String detail) {
        record(username, action, detail, null, null);
    }
}
