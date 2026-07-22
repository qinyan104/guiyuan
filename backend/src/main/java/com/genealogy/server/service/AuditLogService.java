package com.genealogy.server.service;

import com.genealogy.server.model.AuditLog;
import com.genealogy.server.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogService.class);

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void record(String username, String action, String detail, String targetType, Long targetId) {
        try {
            AuditLog log = new AuditLog();
            log.setUsername(resolveUsername(username));
            log.setAction(action);
            log.setDetail(detail);
            log.setTargetType(targetType);
            log.setTargetId(targetId);
            auditLogRepository.save(log);
        } catch (RuntimeException e) {
            logger.warn("Failed to record audit log action={} targetType={} targetId={}", action, targetType, targetId, e);
        }
    }

    private String resolveUsername(String username) {
        if (username != null && !username.isBlank()) {
            return username;
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && authentication.getName() != null
                && !"anonymousUser".equals(authentication.getName())) {
            return authentication.getName();
        }
        return "system";
    }

    public void record(String username, String action, String detail, Long targetId) {
        record(username, action, detail, "publication", targetId);
    }

    public void record(String username, String action, String detail) {
        record(username, action, detail, null, null);
    }
}
