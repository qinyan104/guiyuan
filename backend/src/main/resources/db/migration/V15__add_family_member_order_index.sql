-- Supports the publication tree loader's batched family membership query.
CREATE INDEX idx_family_members_family_sort
    ON family_members (family_db_id, sort_order);
