ALTER TABLE publications
    ADD COLUMN revision BIGINT NOT NULL DEFAULT 0 AFTER publication_info_json;

UPDATE publications
SET revision = 0
WHERE revision IS NULL;
