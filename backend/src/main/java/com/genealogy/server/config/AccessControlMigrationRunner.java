package com.genealogy.server.config;

import com.genealogy.server.model.Publication;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.PublicationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(2)
public class AccessControlMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AccessControlMigrationRunner.class);

    private final PublicationRepository publicationRepository;
    private final PublicationAccessRepository accessRepository;

    public AccessControlMigrationRunner(PublicationRepository publicationRepository,
                                         PublicationAccessRepository accessRepository) {
        this.publicationRepository = publicationRepository;
        this.accessRepository = accessRepository;
    }

    @Override
    public void run(String... args) {
        int migrated = 0;
        for (Publication pub : publicationRepository.findAll()) {
            if (accessRepository.findByPublicationIdAndUserId(pub.getId(), pub.getUserId()).isEmpty()) {
                PublicationAccess access = new PublicationAccess();
                access.setPublicationId(pub.getId());
                access.setUserId(pub.getUserId());
                access.setRole("OWNER");
                access.setCreatedBy(pub.getUserId());
                accessRepository.save(access);
                migrated++;
            }
        }
        if (migrated > 0) {
            log.info("权限回填完成：为 {} 份族谱创建了 OWNER 记录", migrated);
        } else {
            log.info("权限回填：所有族谱已有 OWNER 记录，无需回填");
        }
    }
}
