# 安全加固设计：Spring Security OAuth2 + JWT 全面重构

> 日期：2026-05-07
> 范围：后端认证体系重构 + 前端 Token 存储策略升级 + 安全响应头 + 登录限流 + 密码策略强化

---

## 1. 背景与目标

### 现状问题

| 问题 | 风险等级 | 说明 |
|------|----------|------|
| Token 存 localStorage | 高 | XSS 漏洞可直接窃取 Token |
| 无安全响应头 | 高 | 缺 HSTS、CSP、X-Frame-Options |
| 登录无限流 | 高 | 可被暴力破解 |
| Token 验证不检查过期 | 中 | 仅靠 10 分钟定时清理，有窗口期 |
| Access/Refresh Token 未分离 | 中 | 24h 长 Token 泄露风险大 |
| 无 CSRF 防护 | 中 | Cookie 场景必须有 |
| Spring Security 形同虚设 | 低 | permitAll + CSRF disabled，全部靠自定义拦截器 |

### 目标

- **全面拥抱 Spring Security**，删除自定义 `AuthInterceptor`，用框架内建能力替代
- **JWT + Refresh Token 分离**，Access Token 短命无状态，Refresh Token 可废止
- **HttpOnly Cookie** 存储 Refresh Token，彻底阻断 XSS 窃取
- **安全响应头**全部内建，CSRF 防护就位
- **登录限流**，防暴力破解
- **密码策略**强化，移除 SHA-256 兼容逻辑

---

## 2. 认证流程

### 2.1 登录

```
POST /api/auth/login  (username, password)
  │
  ├─ LoginRateLimitFilter: 检查 IP/用户名限流
  │    └─ 触发限流 → 429 Too Many Requests
  │
  ├─ 验证密码 (BCrypt，兼容旧 SHA-256 并自动迁移)
  │    └─ 失败 → 400 + 累计失败次数
  │
  ├─ 签发 Access Token (JWT, 15分钟)
  │    payload: { sub: username, role: "ADMIN", iat, exp }
  │
  ├─ 签发 Refresh Token (SecureRandom 32字节 → Base64URL)
  │    存储：SHA-256(明文) → refresh_tokens 表
  │
  └─ 响应：
       body: { token: "<JWT>", username, role }
       Set-Cookie: refresh_token=<明文>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=2592000
```

### 2.2 请求认证

```
任意 /api/** 请求（排除公开路径）
  │
  ├─ JwtAuthenticationFilter:
  │    ├─ 读 Authorization: Bearer <JWT>
  │    ├─ jjwt 验签 + 检查过期
  │    ├─ 构建 Authentication (username + ROLE_xxx)
  │    └─ 存入 SecurityContextHolder
  │
  └─ 401 → 前端自动调 /api/auth/refresh
```

### 2.3 Token 刷新

```
POST /api/auth/refresh  (无 body，Cookie 自动带 refresh_token)
  │
  ├─ 读 Cookie 中的 refresh_token
  ├─ SHA-256 后查 refresh_tokens 表
  │    ├─ 不存在/已废止/已过期 → 401
  │    └─ 有效 → 废止旧记录，签发新 JWT + 新 Refresh Token
  │
  └─ 响应：{ token: "<新JWT>" } + Set-Cookie: refresh_token=<新明文>
```

### 2.4 登出

```
POST /api/auth/logout
  │
  ├─ 废止当前 Refresh Token（数据库标记 revoked=true）
  ├─ 清除 Cookie（Set-Cookie: refresh_token=; Max-Age=0）
  └─ 200 OK
```

### 2.5 页面刷新恢复

```
页面加载（accessToken 在 JS 内存中为 null）
  │
  └─ 前端自动调 POST /api/auth/refresh
       ├─ 成功 → 存入 accessToken，继续
       └─ 失败 (401) → 跳转登录页
```

---

## 3. Token 设计

### 3.1 Access Token (JWT)

| 属性 | 值 |
|------|-----|
| 库 | jjwt 0.12.6 |
| 算法 | HS256 (HMAC-SHA256) |
| 有效期 | 15 分钟 |
| 存储 | 前端 JS 内存变量（不存 localStorage / sessionStorage） |
| 携带 | `Authorization: Bearer <token>` |
| Payload | `sub` (username), `role`, `iat`, `exp` |
| 密钥配置 | `application.yml` → `app.jwt.secret`（至少 256 位随机字符串） |

### 3.2 Refresh Token

| 属性 | 值 |
|------|-----|
| 生成 | `SecureRandom(32)` → Base64URL 编码 |
| 存储 | 数据库 `refresh_tokens` 表，仅存 SHA-256 哈希 |
| 前端 | HttpOnly Cookie，JS 不可读 |
| 有效期 | 30 天 |
| 使用模式 | 单次使用（用后废止旧的，签发新的） |
| 安全属性 | HttpOnly=true, Secure=true, SameSite=Strict, Path=/api/auth |

### 3.3 数据库表

```sql
CREATE TABLE refresh_tokens (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    token_hash  VARCHAR(64)  NOT NULL UNIQUE COMMENT 'SHA-256(明文 token)',
    user_id     BIGINT       NOT NULL,
    expires_at  DATETIME     NOT NULL,
    revoked     BOOLEAN      DEFAULT FALSE,
    created_at  DATETIME     DEFAULT NOW(),
    INDEX idx_user_active (user_id, revoked, expires_at)
);
```

---

## 4. 安全响应头

Spring Security 内建，无需手动维护：

| Header | 值 | 作用 |
|--------|-----|------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | 强制 HTTPS（生产） |
| `X-Content-Type-Options` | `nosniff` | 防 MIME 嗅探 |
| `X-Frame-Options` | `DENY` | 防点击劫持 |
| `Cache-Control` | `no-cache, no-store, must-revalidate` | 敏感页面不缓存 |
| `X-XSS-Protection` | `0` | 现代浏览器交给 CSP |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` | 资源加载白名单 |

---

## 5. CSRF 防护

### 为什么需要

Refresh Token 存在 HttpOnly Cookie 中，浏览器会自动在每个请求中携带。攻击者可在恶意页面诱导用户发请求。CSRF Token 让后端能区分"真正的前端请求"和"跨站伪造请求"。

### 实现

后端：`CookieCsrfTokenRepository.withHttpOnlyFalse()`（前端 JS 才能读到）

前端：axios 自动配置
```typescript
axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';
```

豁免路径：`/api/auth/login`、`/api/auth/register`（未登录用户无法有 CSRF Token）

---

## 6. 登录限流

### 规则

| 维度 | 窗口 | 阈值 | 封锁时间 |
|------|------|------|----------|
| IP 地址 | 5 分钟 | 10 次失败 | 15 分钟 |
| 用户名 | 5 分钟 | 5 次失败 | 15 分钟 |

任一触发即拒绝，返回 `429 Too Many Requests`，响应体包含剩余封锁时间。

### 实现

- `LoginRateLimitFilter`，在 `JwtAuthenticationFilter` 之前执行
- 数据结构：`ConcurrentHashMap<AttemptKey, List<Instant>>`
- 无需 Redis，内存计数器 + 服务重启自动重置
- 仅作用于 `/api/auth/login` 路径

---

## 7. 密码策略

### 规则

| 属性 | 旧规则 | 新规则 |
|------|--------|--------|
| 最低长度 | 4 字符 | 8 字符 |
| 复杂度 | 无 | 必须含大写 + 小写 + 数字 |
| 存储 | BCrypt + SHA-256 兼容 | 仅 BCrypt |

### 校验

自定义 `@ValidPassword` 注解：
```java
@Pattern(
    regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,100}$",
    message = "密码至少8位，须包含大小写字母和数字"
)
```

### 迁移策略

- 现有用户下次登录时，先用 BCrypt 校验，失败则尝试 SHA-256 校验
- SHA-256 校验通过 → 自动升级为 BCrypt（复用现有逻辑，但移除对新用户的 SHA-256 路径）
- 密码修改接口（`ProfileController`）强制新策略

---

## 8. 权限体系整合

### 角色

不变：`SUPER_ADMIN`、`ADMIN`、`USER`

### 注解替换手动检查

| 接口 | 旧方式 | 新方式 |
|------|--------|--------|
| `/api/admin/**`（用户管理） | `requireAdmin(request)` | `@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")` |
| `/api/admin/**`（角色变更/备份） | `requireSuperAdmin(request)` | `@PreAuthorize("hasRole('SUPER_ADMIN')")` |
| 其他 `/api/**` | AuthInterceptor 拦截 | Spring Security `.authenticated()` |

### 获取当前用户名

```java
// 旧
String username = (String) request.getAttribute("currentUsername");

// 新
String username = SecurityContextHolder.getContext().getAuthentication().getName();
```

### PublicationAuthorizationService

不变，保留原样。与 Spring Security 是独立的两层：
- Spring Security → 验证身份（Authentication）
- PublicationAuthorizationService → 验证族谱级权限（Authorization）

---

## 9. SecurityConfig 最终形态

```java
@Bean
SecurityFilterChain filterChain(HttpSecurity http,
        JwtAuthenticationFilter jwtAuthFilter,
        LoginRateLimitFilter loginRateLimitFilter) throws Exception {
    http
        .headers(headers -> headers
            .contentSecurityPolicy(csp -> csp.policyDirectives(
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"))
            .hsts(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
        )
        .csrf(csrf -> csrf
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            .ignoringRequestMatchers("/api/auth/login", "/api/auth/register")
        )
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/refresh").permitAll()
            .requestMatchers("/api/photos/**").permitAll()
            .requestMatchers("/api/shares/**").permitAll()
            .requestMatchers("/api/admin/**").authenticated()
            .anyRequest().authenticated()
        )
        .addFilterBefore(loginRateLimitFilter, JwtAuthenticationFilter.class)
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
    return http.build();
}
```

---

## 10. 前端改造要点

### 删除

- `localStorage.getItem("token")` / `setItem` — 不再使用 localStorage 存 Token

### 新增

```typescript
// tokenStore.ts — Access Token 仅存 JS 内存
let accessToken: string | null = null;
export const getAccessToken = () => accessToken;
export const setAccessToken = (t: string) => { accessToken = t; };
export const clearAccessToken = () => { accessToken = null; };
```

### axios 拦截器改造

```typescript
// 请求拦截：自动带 JWT
axios.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：401 时自动刷新（仅重试一次）
axios.interceptors.response.use(null, async error => {
  if (error.response?.status === 401 && !error.config._retry) {
    error.config._retry = true;
    try {
      const { data } = await axios.post('/api/auth/refresh');
      setAccessToken(data.token);
      return axios(error.config);
    } catch {
      clearAccessToken();
      router.push('/login');
    }
  }
  throw error;
});

// CSRF 自动配置
axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';
```

### 页面加载恢复

```typescript
// App.vue onMounted
onMounted(async () => {
  try {
    const { data } = await axios.post('/api/auth/refresh');
    setAccessToken(data.token);
  } catch {
    // 未登录，跳转登录页
  }
});
```

---

## 11. 开发环境特殊处理

| 配置项 | 开发环境 | 生产环境 |
|--------|---------|---------|
| HTTPS | 关闭 | 开启 |
| Cookie Secure | false | true |
| HSTS | 关闭 | 开启 |
| CSRF Cookie Secure | false | true |
| JWT 密钥 | 配置文件明文 | 环境变量 |

---

## 12. 删除的代码清单

| 文件 | 删除内容 |
|------|---------|
| `AuthInterceptor.java` | 整个文件删除 |
| `WebConfig.java` | `addInterceptors()` 方法删除 |
| `UserService.java` | `tokenStore`、`TokenEntry`、`validateToken()`、`removeToken()`、`evictExpiredTokens()`、`sha256Hex()` |
| `AdminController.java` | `requireAdmin()`、`requireSuperAdmin()` 方法 |
| `SecurityConfig.java` | 重写，现有内容全部替换 |

---

## 13. 新增的代码清单

| 文件 | 说明 |
|------|------|
| `JwtAuthenticationFilter.java` | JWT 解析 + Authentication 构建 |
| `JwtService.java` | JWT 签发 + 验证工具类 |
| `RefreshTokenService.java` | Refresh Token 生成/验证/废止 |
| `RefreshToken.java` | JPA 实体 |
| `RefreshTokenRepository.java` | Spring Data JPA Repository |
| `LoginRateLimitFilter.java` | 登录限流过滤器 |
| `ValidPassword.java` | 自定义密码校验注解 |
| `PasswordValidator.java` | 密码校验逻辑 |
| `tokenStore.ts` | 前端 Token 内存管理 |

---

## 14. 安全测试要点

| 测试项 | 验证内容 |
|--------|---------|
| JWT 过期 | 15 分钟后请求返回 401 |
| Refresh Token 过期/废止 | 30 天后或主动登出后无法刷新 |
| CSRF 防护 | 缺少 CSRF Token 的 POST 请求返回 403 |
| 登录限流 | 连续失败后返回 429 |
| 密码策略 | 弱密码被拒绝 |
| 安全头 | 响应包含 CSP、HSTS、X-Frame-Options 等 |
| IDOR | 非 OWNER 无法访问他人族谱（确认不回归） |
| HttpOnly Cookie | 浏览器 DevTools 中标记 HttpOnly，JS 无法读取 |
| Refresh Token 单次使用 | 使用后旧 Token 立即失效 |
