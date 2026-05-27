-- Add missing indexes for frequently queried columns
CREATE INDEX idx_persons_publication_id ON persons (publication_id);
CREATE INDEX idx_families_publication_id ON families (publication_id);
CREATE INDEX idx_family_members_family_db_id ON family_members (family_db_id);
CREATE INDEX idx_family_members_person_db_id ON family_members (person_db_id);

-- Add missing foreign keys for referential integrity
-- V1 tables
ALTER TABLE publications
    ADD CONSTRAINT fk_publications_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE persons
    ADD CONSTRAINT fk_persons_publication
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE;

ALTER TABLE families
    ADD CONSTRAINT fk_families_publication
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE;

ALTER TABLE family_members
    ADD CONSTRAINT fk_family_members_family
    FOREIGN KEY (family_db_id) REFERENCES families(id) ON DELETE CASCADE;

ALTER TABLE family_members
    ADD CONSTRAINT fk_family_members_person
    FOREIGN KEY (person_db_id) REFERENCES persons(id) ON DELETE CASCADE;

ALTER TABLE photos
    ADD CONSTRAINT fk_photos_person
    FOREIGN KEY (person_db_id) REFERENCES persons(id) ON DELETE SET NULL;

ALTER TABLE publication_access
    ADD CONSTRAINT fk_pub_access_publication
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE;

ALTER TABLE publication_access
    ADD CONSTRAINT fk_pub_access_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE publication_share_links
    ADD CONSTRAINT fk_share_links_publication
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE;

-- V5 tables
ALTER TABLE person_accounts
    ADD CONSTRAINT fk_person_accounts_person
    FOREIGN KEY (person_db_id) REFERENCES persons(id) ON DELETE CASCADE;

ALTER TABLE person_accounts
    ADD CONSTRAINT fk_person_accounts_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE person_accounts
    ADD CONSTRAINT fk_person_accounts_publication
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE;

ALTER TABLE change_requests
    ADD CONSTRAINT fk_change_requests_publication
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE;

ALTER TABLE change_requests
    ADD CONSTRAINT fk_change_requests_person
    FOREIGN KEY (person_db_id) REFERENCES persons(id) ON DELETE CASCADE;

ALTER TABLE change_requests
    ADD CONSTRAINT fk_change_requests_submitted_by
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE change_requests
    ADD CONSTRAINT fk_change_requests_reviewed_by
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
