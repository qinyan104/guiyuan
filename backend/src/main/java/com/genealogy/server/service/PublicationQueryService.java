package com.genealogy.server.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.AuditLog;
import com.genealogy.server.model.Publication;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.repository.AuditLogRepository;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.PublicationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 家谱出版物的只读查询路径。
 *
 * <p>本类从 {@link PublicationService} 中拆分而来。拆分依据是依赖边界：
 * 读取路径只需要 publication / access / audit / treeLoader / objectMapper，
 * 完全不涉及写模型所需的人员、家庭、照片、分支合并等协作者，
 * 因此可以独立演进与测试。
 *
 * <p>写路径（创建、更新、删除、保存人员与家庭）仍由 {@link PublicationService} 负责。
 */
@Service
public class PublicationQueryService {

    private static final Logger log = LoggerFactory.getLogger(PublicationQueryService.class);

    private static final List<String> PUBLICATION_MUTATION_ACTIONS = List.of(
            "CREATE_PUB",
            "UPDATE_PUB",
            "UPDATE_PUB_META",
            "UPDATE_PERSON",
            "DELETE_PUB"
    );

    private final PublicationRepository publicationRepository;
    private final PublicationAccessRepository publicationAccessRepository;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;
    private final PublicationTreeLoader treeLoader;

    public PublicationQueryService(PublicationRepository publicationRepository,
                                   PublicationAccessRepository publicationAccessRepository,
                                   AuditLogRepository auditLogRepository,
                                   ObjectMapper objectMapper,
                                   PublicationTreeLoader treeLoader) {
        this.publicationRepository = publicationRepository;
        this.publicationAccessRepository = publicationAccessRepository;
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
        this.treeLoader = treeLoader;
    }

    /**
     * 列出某用户可访问的全部出版物，附带访问角色与最近一次变更信息。
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPublications(Long userId) {
        List<PublicationAccess> accessRecords = publicationAccessRepository.findByUserId(userId);
        Set<Long> accessibleIds = accessRecords.stream()
                .map(PublicationAccess::getPublicationId)
                .collect(java.util.stream.Collectors.toSet());

        List<Publication> owned = publicationRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        for (Publication pub : owned) {
            accessibleIds.add(pub.getId());
        }

        if (accessibleIds.isEmpty()) {
            return List.of();
        }

        Map<Long, String> roleMap = new HashMap<>();
        for (PublicationAccess access : accessRecords) {
            roleMap.put(access.getPublicationId(), access.getRole());
        }
        for (Publication pub : owned) {
            roleMap.putIfAbsent(pub.getId(), "OWNER");
        }

        List<Publication> publications = new ArrayList<>(publicationRepository.findAllById(accessibleIds));
        publications.sort(Comparator.comparing(Publication::getUpdatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())));

        // 批量取最近审计日志，避免逐个查询
        Map<Long, AuditLog> latestAuditByPubId = new HashMap<>();
        List<AuditLog> auditLogs = auditLogRepository
                .findLatestByTargetIds("publication", accessibleIds, PUBLICATION_MUTATION_ACTIONS);
        for (AuditLog logEntry : auditLogs) {
            latestAuditByPubId.merge(logEntry.getTargetId(), logEntry,
                    (a, b) -> a.getCreatedAt().isAfter(b.getCreatedAt()) ? a : b);
        }

        return publications.stream()
                .map(publication -> toListEntry(publication, roleMap, latestAuditByPubId))
                .toList();
    }

    private Map<String, Object> toListEntry(Publication publication,
                                            Map<Long, String> roleMap,
                                            Map<Long, AuditLog> latestAuditByPubId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", publication.getId());
        result.put("revision", publication.getRevision());
        result.put("title", publication.getTitle());
        result.put("subtitle", publication.getSubtitle());
        result.put("createdAt", publication.getCreatedAt());
        result.put("updatedAt", publication.getUpdatedAt());
        result.put("accessRole", roleMap.getOrDefault(publication.getId(), "OWNER"));

        AuditLog auditLog = latestAuditByPubId.get(publication.getId());
        if (auditLog != null) {
            result.put("lastUpdatedBy", auditLog.getUsername());
            result.put("lastActivityAction", auditLog.getAction());
        }

        if (publication.getPublicationInfoJson() != null) {
            try {
                Map<String, Object> info = objectMapper.readValue(
                        publication.getPublicationInfoJson(),
                        new TypeReference<>() {}
                );
                result.put("info", info);
                Object description = info.get("description");
                if (description instanceof String text && !text.isBlank()) {
                    result.put("description", text.length() > 80 ? text.substring(0, 80) + "..." : text);
                }
            } catch (JsonProcessingException e) {
                log.warn("Publication {} info JSON parse failed: {}", publication.getId(), e.getMessage());
            }
        }

        return result;
    }

    /**
     * 加载出版物完整数据（含根谱与挂载分支，最大深度 3）。
     */
    @Transactional(readOnly = true)
    public Map<String, Object> loadPublication(Long publicationId) {
        long startedAt = System.nanoTime();
        Publication publication = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new NotFoundException("Publication not found"));
        long publicationQueryMs = elapsedMillis(startedAt);

        Map<String, Map<String, Object>> people = new LinkedHashMap<>();
        Map<String, Map<String, Object>> families = new LinkedHashMap<>();

        // 加载联邦数据（根谱 + 已挂载分支，深度上限 3）
        treeLoader.loadFederatedData(publicationId, 3, "", people, families);
        long treeLoadMs = elapsedMillis(startedAt) - publicationQueryMs;

        Map<String, Object> publicationJson = new LinkedHashMap<>();
        publicationJson.put("title", publication.getTitle());
        publicationJson.put("subtitle", publication.getSubtitle() != null ? publication.getSubtitle() : "");
        publicationJson.put("focusFamilyId", publication.getFocusFamilyId() != null ? publication.getFocusFamilyId() : "");
        publicationJson.put("people", people);
        publicationJson.put("families", families);

        if (publication.getPublicationInfoJson() != null) {
            try {
                publicationJson.put("info", objectMapper.readValue(
                        publication.getPublicationInfoJson(), new TypeReference<>() {}));
            } catch (JsonProcessingException e) {
                log.warn("Publication {} info JSON parse failed: {}", publication.getId(), e.getMessage());
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", publication.getId());
        response.put("revision", publication.getRevision());
        response.put("publication", publicationJson);
        response.put("settings", readSettings(publication));

        log.debug("publication.load id={} publicationQueryMs={} treeLoadMs={} assembleMs={} totalMs={} people={} families={}",
                publicationId,
                publicationQueryMs,
                treeLoadMs,
                elapsedMillis(startedAt) - publicationQueryMs - treeLoadMs,
                elapsedMillis(startedAt),
                people.size(),
                families.size());
        return response;
    }

    private Map<String, Object> readSettings(Publication publication) {
        if (publication.getSettingsJson() == null) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(publication.getSettingsJson(), new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }

    /**
     * 读取出版物当前修订号，用于客户端乐观锁校验。
     */
    @Transactional(readOnly = true)
    public long getPublicationRevision(Long publicationId) {
        return publicationRepository.findById(publicationId)
                .map(Publication::getRevision)
                .orElseThrow(() -> new NotFoundException("Publication not found"));
    }

    private long elapsedMillis(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }
}
