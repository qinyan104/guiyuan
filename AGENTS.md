<claude-mem-context>
# Memory Context

# [族谱管理系统] recent context, 2026-05-08 10:35pm GMT+8

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 72 obs (4,798t read) | 579,884t work | 99% savings

### May 4, 2026
1108 8:09p 🔵 用户发起问候
1112 9:22p 🔵 用户发起问候
1113 11:53p 🟣 Admin Console Route Metadata Foundation
1114 11:55p 🔴 修复adminConsoleMeta中getAdminPageMeta的属性检查漏洞
### May 5, 2026
1115 12:34a 🔴 修复 getUserRoleLabel 的类型安全性和运行时检查
### May 7, 2026
1287 12:33p ⚖️ 项目发展方向与建议
1288 12:48p ⚖️ 项目发展方向建议
1289 3:00p ⚖️ 项目下一步行动方向
1290 " 🔵 搜索“Collaborator Management UI Implementation Plan”文档
1291 " 🔵 未找到“Collaborator Management UI Implementation Plan”文档
1293 " 🔴 解决API客户端依赖问题
1295 " 🔵 检查`publication.ts`文件中的API模式
1297 " 🔵 检查`PublicationController.java`中的响应模式
1299 3:01p 🔴 更新UserController以使用ApiResponse包装搜索结果
1303 " 🔴 更新PublicationAccessController以统一API响应格式并处理国际化
1309 3:18p ⚖️ 项目下一步行动方向
1310 " 🟣 添加访问管理 API 客户端
1311 3:29p ⚖️ 项目下一步行动规划
1315 " 🔵 读取计划文档
1317 3:30p 🔵 查找所有 Markdown 文档
1321 " 🔵 搜索特定计划文档
1329 " 🔵 搜索特定组件文件
1345 " 🔵 列出工作树目录内容
1359 " 🔵 读取设计规范文档
1371 3:31p 🔵 读取设计文档
1386 3:33p 🔵 项目下一步行动的初步探讨
1387 " 🔵 项目文档结构已更新
1388 " 🔵 搜索文档以查找特定计划
1389 3:47p ⚖️ 项目下一步行动方向的初步探讨
1390 5:40p ⚖️ 确定项目下一步行动方向
1391 5:43p ⚖️ 项目下一步行动决策
### May 8, 2026
1396 5:06p 🟣 协作功能收尾
1397 " ✅ 激活开发分支收尾技能
1398 " ✅ 开发分支收尾技能需要信息
1400 " ✅ 激活 Neat-Freak 技能
1402 " ✅ 调用 Generalist Agent 进行测试和分支验证
1404 5:07p ⚖️ 协作功能分支收尾选项
1408 5:14p 🟣 协作功能收尾
1410 " ✅ 协作功能收尾计划
1412 5:15p ✅ 展示收尾计划以供审阅
1414 " ✅ 协作功能收尾计划生成
1418 " ✅ 更新协作功能收尾计划
1424 5:16p ✅ 协作功能收尾计划中文回复
1483 5:19p ✅ 开始测试验证阶段
1507 7:40p 🔵 代码改动引发潜在问题
1508 7:42p 🔴 修复了用户输入验证逻辑中的边界条件错误
1509 7:43p 🔴 修复了用户输入验证逻辑中的潜在问题
1510 9:12p 🔴 修复页面内容延迟加载和退出登录跳转问题
1511 9:41p 🔵 用户退出登录后直接进入主页的行为
1512 9:43p 🔵 搜索 AuthController、/api/auth/logout 和 logout() 的代码引用
### May 10, 2026
1513 11:15a 🟣 并发冲突控制实施
1514 " ✅ 引入 JPA @Version 乐观锁
1515 " ✅ 实现聚合根联动自增逻辑
1516 " ✅ 前端 http 拦截器与 App.vue 冲突对话框
1517 " ✅ 更新测试用例覆盖版本冲突场景
1518 11:45a ✅ 洁癖技能：同步文档与记忆
1519 12:05p 🟣 精细化子树合并实施
1520 " ✅ 后端 BFS 收集器重构 (collectSubtreeIds)
1521 " ✅ 缝合加载剪枝逻辑 (PublicationTreeLoader)
1522 " ✅ 视觉化起点选择器 (SubtreeRootSelector.vue)
1523 " ✅ UI 集成 (BranchMountManager.vue)
1524 " ✅ 完成全链路验证

1525 6:30p 🔴 修复AdminUsersView角色变更弹窗中文乱码
1526 " ✅ 修复ExportDialog 'Export'改'导出'
1527 " ✅ 修复useFileOperations.ts 10+条英文提示改中文
1528 " ✅ 修复PrintPreviewView 2条英文改中文
1529 " ✅ 修复shareHtmlExport.ts 25+处中文乱码（性别/字段/关系/按钮）
1530 " ✅ 重新构建前端dist并同步到release目录

### May 20, 2026
1531 2:51p 🟣 协作者管理页面优化
1532 " ✅ 重构 CollaboratorManager：折叠权限说明、搜索芯片选择、Toast反馈、avatar安全函数
1533 " ✅ 弹窗添加纵向滚动
1534 3:20p 🔴 修复已故族人被派生账号的bug
1535 " ✅ PublicationService 保存时从 death 推断 deceased
1536 " ✅ AccountDerivationService 增加 death 二次校验
1537 3:32p 🔴 修复关联User删除后页面白屏
1538 " ✅ listAccessRecords 过滤 User 已删除的空悬记录
1539 " ✅ 前端 avatarLetter() 防御 nickname 为 undefined
1540 3:42p 🟣 账号管理：空悬清理 + 批量删除 + 确认弹窗
1541 " ✅ 后端: deleteAccount, batchDeleteAccounts, cleanupOrphanedAccounts
1542 " ✅ 前端: 复选框全选、批量操作栏、删除按钮、确认弹窗
1543 " ✅ AdminAccountsView 同步升级
1544 4:27p 🟣 派生用户名改为拼音(pinyin4j)
1545 5:14p 🔴 恢复误删的AdminAccountsView并补全功能
1546 5:30p 🔄 列宽优化：操作栏1.5fr→2fr，按钮不换行

### May 20, 2026 (续)
1547 5:45p 🟣 AdminUsersView 账号管理全选批量删除
1548 " ✅ 后端 AdminController 新增 POST /users/batch-delete 端点
1549 " ✅ 后端 UserService 新增 batchDeleteUsers 方法（跳过 SUPER_ADMIN）
1550 " ✅ 前端 admin.ts 新增 adminBatchDeleteUsers API
1551 " ✅ AdminUsersView 表头全选复选框 + 行复选框 + 批量操作栏
1552 6:10p 🔄 CollaboratorManager 账号表格操作列布局优化
1553 " ✅ Grid 改为 minmax(60px,1fr)...auto，操作列自适应宽度
1554 " ✅ ac-actions 加 white-space:nowrap + flex-shrink:0
1555 " ✅ btn-text 字号12→11px，padding 6→4px
1556 6:20p 🔄 AdminUsersView 批量操作栏配色统一为 amber 主题
1557 " ✅ batch-bar 背景 amber 半透明 + dashed amber 边框
1558 " ✅ is-selected 高亮、checkbox accent 改为 amber
1559 6:50p 🔵 亲戚关系推算功能分析（kinship.ts ~850行）
1560 " ⚖️ 诊断：堂/表分界不准确、伯父/叔叔区分脆弱、缺路径可视化
1561 " ⚖️ 建议：关系路径可视化、修正堂表判断、出生年份比长幼
1562 7:10p 🟣 以我为中心的亲属关系视图（Ego-centered kinship）
1563 " ✅ usePublicationState 新增 _viewerPersonId 响应式 ref + setViewerPersonId()
1564 " ✅ PublicationLayout 加载后自动匹配登录用户→族人ID（listAccounts）
1565 " ✅ WorkbenchView 监听 viewerPersonId 首次非空后自动滚动定位
1566 " ✅ PersonCardSvg 加 person-card--ego CSS 类（金色描边+发光阴影）
1567 " ✅ style.css 新增 Ego 卡片样式：金色描边2.8px + drop-shadow
1568 " 🎯 效果：族人登录后自动定位自己，每张卡片显示亲戚称谓


Access 580k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>
