CREATE TABLE uploaded_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    original_name VARCHAR(255),
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    owner_user_id BIGINT NOT NULL,
    publication_id BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_uploaded_files_owner (owner_user_id),
    INDEX idx_uploaded_files_publication (publication_id),
    CONSTRAINT fk_uploaded_files_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
