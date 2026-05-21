-- V12__publishing_engine.sql
-- Traditional Book Publishing Engine - Core Schema

CREATE TABLE book_drafts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    publication_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL DEFAULT '未命名草稿',
    subtitle VARCHAR(200) DEFAULT '',
    preface TEXT,
    epilogue TEXT,
    style_config JSON,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    version INT NOT NULL DEFAULT 1,
    snapshot_revision BIGINT NOT NULL DEFAULT 0,
    created_by BIGINT,
    updated_by BIGINT,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_book_drafts_publication FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE
);

CREATE TABLE book_sheets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    draft_id BIGINT NOT NULL,
    sheet_number INT NOT NULL,
    sheet_type VARCHAR(20) NOT NULL DEFAULT 'genealogy',
    layout_data JSON,
    auto_generated_at DATETIME,
    CONSTRAINT fk_book_sheets_draft FOREIGN KEY (draft_id) REFERENCES book_drafts(id) ON DELETE CASCADE
);

CREATE TABLE book_person_details (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    draft_id BIGINT NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    biography TEXT,
    interlinear_notes JSON,
    seal_style VARCHAR(50),
    user_modified BOOLEAN NOT NULL DEFAULT FALSE,
    source_fields_hash VARCHAR(32),
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_book_person_details_draft FOREIGN KEY (draft_id) REFERENCES book_drafts(id) ON DELETE CASCADE,
    CONSTRAINT uk_draft_person UNIQUE (draft_id, person_id)
);

CREATE TABLE sheet_element_overrides (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sheet_id BIGINT NOT NULL,
    element_key VARCHAR(64) NOT NULL,
    override_x DECIMAL(10,2),
    override_y DECIMAL(10,2),
    override_scale DECIMAL(3,2) DEFAULT 1.00,
    override_visible BOOLEAN,
    is_manual BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_sheet_element_overrides_sheet FOREIGN KEY (sheet_id) REFERENCES book_sheets(id) ON DELETE CASCADE,
    CONSTRAINT uk_sheet_element UNIQUE (sheet_id, element_key)
);

CREATE TABLE draft_sync_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    draft_id BIGINT NOT NULL,
    person_id VARCHAR(50),
    change_type VARCHAR(20) NOT NULL,
    old_values JSON,
    new_values JSON,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME,
    CONSTRAINT fk_draft_sync_logs_draft FOREIGN KEY (draft_id) REFERENCES book_drafts(id) ON DELETE CASCADE
);

CREATE INDEX idx_book_drafts_publication ON book_drafts(publication_id);
CREATE INDEX idx_book_drafts_status ON book_drafts(publication_id, status);
CREATE INDEX idx_book_sheets_draft ON book_sheets(draft_id);
CREATE INDEX idx_book_person_details_draft ON book_person_details(draft_id);
CREATE INDEX idx_book_person_details_person ON book_person_details(draft_id, person_id);
CREATE INDEX idx_sheet_element_overrides_sheet ON sheet_element_overrides(sheet_id);
CREATE INDEX idx_draft_sync_logs_draft ON draft_sync_logs(draft_id);
CREATE INDEX idx_draft_sync_logs_acknowledged ON draft_sync_logs(draft_id, acknowledged);
