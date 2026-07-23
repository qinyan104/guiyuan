CREATE TABLE book_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    publication_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL DEFAULT '未命名书稿',
    document_json JSON NOT NULL,
    created_by BIGINT,
    updated_by BIGINT,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_book_documents_publication FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE
);

CREATE INDEX idx_book_documents_publication ON book_documents(publication_id);
CREATE INDEX idx_book_documents_updated ON book_documents(publication_id, updated_at);
