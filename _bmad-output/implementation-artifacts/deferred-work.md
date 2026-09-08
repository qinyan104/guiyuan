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
