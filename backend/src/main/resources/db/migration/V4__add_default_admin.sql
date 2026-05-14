-- 创建默认管理员账号
-- 密码: 123456 (BCrypt 加密)
INSERT INTO users (username, password, nickname, role, created_at)
VALUES ('root', '$2a$10$rLyRkUay/Y2VJzRj6tJUEu7R.b8dOXFnUNlp5PuGsqZVeaSqRIhAW', '超级管理员', 'SUPER_ADMIN', NOW())
ON DUPLICATE KEY UPDATE username = username;
