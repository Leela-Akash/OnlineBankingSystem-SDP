package com.banking.sdp.backend.service;

import com.banking.sdp.backend.model.AuditLog;
import com.banking.sdp.backend.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuditLogService {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogService.class);

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String actorUsername, String role, String action, String resourceType,
                    String resourceId, String details, String ipAddress) {
        try {
            AuditLog auditLog = new AuditLog(
                    actorUsername != null ? actorUsername : "ANONYMOUS",
                    role,
                    action,
                    resourceType,
                    resourceId,
                    details,
                    ipAddress
            );
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            logger.error("Failed to persist audit log: {}", e.getMessage());
        }
    }

    public List<AuditLog> getRecentLogs() {
        return auditLogRepository.findTop100ByOrderByTimestampDesc();
    }
}
