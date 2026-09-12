- source_spec: none
  summary: 修复后端 Docker 构建链路，避免 release/backend.Dockerfile 依赖本地已有 jar。
  evidence: 从“技术债 1/2/4/5/6”中拆分；该目标可独立验证 Docker backend image fresh checkout 构建。
- source_spec: none
  summary: 完整处理未跟踪 guiyuan/ 本地部署产物目录，防止误提交密钥与构建产物。
  evidence: 从“技术债 1/2/4/5/6”中拆分；本轮仅按用户确认加入 .gitignore 作为继续工作的安全前置，后续可独立审计是否删除或迁移目录。
- source_spec: none
  summary: 清理前端 Biome warnings，移除未使用代码、非空断言和残留设计实验代码。
  evidence: 从“技术债 1/2/4/5/6”中拆分；该目标可独立以 npm run biome:check warning 收敛验证。
- source_spec: none
  summary: 梳理后端 DTO/entity/Map 边界，降低 Person 与 PublicationData 多套模型字段漂移风险。
  evidence: 从“技术债 1/2/4/5/6”中拆分；该目标涉及后端架构重构，可独立设计、实现和回归。
- source_spec: `_bmad-output/implementation-artifacts/spec-fix-frontend-high-risk-dependencies.md`
  summary: 单独治理前端开发依赖审计漏洞，目标是让完整 `npm audit` 也清零。
  evidence: 本轮按 spec 只治理生产依赖；`npm ci` 后普通 audit 摘要仍提示 7 个 dev-scope 漏洞（1 low、5 high、1 critical）。
- source_spec: none
  summary: 修复文件上传鉴权顺序，并为文件系统与数据库写入增加失败补偿清理。
  evidence: 从项目锐评修复计划中拆分；上传安全可独立实现并通过控制器与存储失败路径测试验证。
- source_spec: none
  summary: 将镜像发布和生产部署约束在完整 CI 成功之后。
  evidence: 从项目锐评修复计划中拆分；CI/CD 门禁可独立修改工作流并验证事件与提交 SHA 传递。
- source_spec: none
  summary: 收敛 Spring 多配置源，并将 Flyway baseline 改为显式运维开关。
  evidence: 从项目锐评修复计划中拆分；配置治理涉及部署兼容性，应独立审查和验证。
- source_spec: none
  summary: 按稳定接口逐步拆分 kinship 与大型 Vue 组件。
  evidence: 从项目锐评修复计划中拆分；模块重构范围较大且不应与质量门禁修复混在同一变更中。
- source_spec: none
  summary: 重整 README 信息结构，并以可验证证据替换宣传性表述。
  evidence: 从项目锐评修复计划中拆分；文档调整可独立评审，不影响本轮恢复质量门禁。
- source_spec: `_bmad-output/implementation-artifacts/spec-restore-repository-quality-gates.md`
  summary: 补充默认管理员密码替换的持久化调用验证。
  evidence: `SecurityStartupCheckTest` 只断言实体字段变化，删除 `userRepository.save` 后仍可能通过。
- source_spec: `_bmad-output/implementation-artifacts/spec-restore-repository-quality-gates.md`
  summary: 补充非默认管理员密码不会被初始密码覆盖的回归测试。
  evidence: 现有启动安全测试只覆盖默认密码分支，未固定已有强密码的保留行为。
- source_spec: `_bmad-output/implementation-artifacts/spec-restore-repository-quality-gates.md`
  summary: 为仓库级配置文件增加 UTF-8 BOM 自动检查。
  evidence: 本轮手工移除了 Compose 文件 BOM，但现有门禁无法阻止同类编码问题再次进入仓库。
- source_spec: `_bmad-output/implementation-artifacts/spec-restore-repository-quality-gates.md`
  summary: 将管理员用户列表 API 的位置参数收敛为具名查询对象。
  evidence: 当前四个同类型位置参数依赖调用顺序，格式化后的调用仍容易在扩展筛选条件时传错。
- source_spec: `_bmad-output/implementation-artifacts/spec-harden-upload-storage.md`
  summary: 将上传文件系统操作提取为可测试的存储模块，并评估以可信目录句柄抵御上传根目录 symlink/junction 替换。
  evidence: 本轮已阻止目标文件覆盖并限制补偿删除范围；若威胁模型包含可并发修改服务器本地上传目录的攻击者，单纯规范化 Path 无法消除目录替换竞态，需要更深的存储边界设计和平台兼容验证。
