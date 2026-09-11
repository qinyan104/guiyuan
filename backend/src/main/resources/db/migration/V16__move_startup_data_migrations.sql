-- 将原本在应用启动时执行的数据修复迁移到 Flyway。
-- 角色补齐保持旧逻辑：没有超级管理员时，按最小 ID 选择一个管理员提升；
-- 其余缺失角色设为普通管理员。已有角色和超级管理员不受影响。
UPDATE users u
LEFT JOIN (
    SELECT MIN(id) AS first_admin_id
    FROM users
    WHERE role IS NULL OR role = '' OR role = 'ADMIN'
) candidate ON 1 = 1
SET u.role = CASE
    WHEN u.id = candidate.first_admin_id THEN 'SUPER_ADMIN'
    ELSE 'ADMIN'
END
WHERE u.role IS NULL OR u.role = '';

-- 为历史族谱补齐 OWNER 权限。publication_access 已有
-- (publication_id, user_id) 唯一约束，因此重复执行不会产生重复记录。
INSERT INTO publication_access (publication_id, user_id, role, created_by)
SELECT p.id, p.user_id, 'OWNER', p.user_id
FROM publications p
LEFT JOIN publication_access a
    ON a.publication_id = p.id AND a.user_id = p.user_id
WHERE a.id IS NULL;
