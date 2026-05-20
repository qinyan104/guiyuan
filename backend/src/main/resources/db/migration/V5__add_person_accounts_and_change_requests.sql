CREATE TABLE person_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    person_db_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    publication_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_person_accounts_person UNIQUE (person_db_id),
    CONSTRAINT uk_person_accounts_user UNIQUE (user_id),
    INDEX idx_person_accounts_pub (publication_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE change_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    publication_id BIGINT NOT NULL,
    person_db_id BIGINT NOT NULL,
    field_name VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    submitted_by BIGINT NOT NULL,
    reviewed_by BIGINT,
    reject_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    INDEX idx_change_requests_pub_status (publication_id, status),
    INDEX idx_change_requests_person_status (person_db_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
