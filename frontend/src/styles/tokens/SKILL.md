---
name: guiyuan-design
description: '归源族谱管理系统设计规范。触发词：设计新组件 / 改样式 / 检查颜色合规 / 写一个新页面 / 改这个组件的样式'
---

# guiyuan-design

归源（族谱管理系统）的设计规范，基于 Yohaku (Innei) 设计体系，适配族谱场景。

## Step 1 · 确定任务类型

| 用户说 | 任务 | 需要读取 |
|--------|------|----------|
| "新组件" / "写一个XX页面" | 新建组件 | `CHEATSHEET.md` |
| "改这个组件的样式" / "颜色不对" | 修改样式 | `CHEATSHEET.md` + 检查组件的 `<style scoped>` |
| "检查颜色合规" / "token 审查" | Token 审计 | `CHEATSHEET.md` 禁止事项清单 |

## Step 2 · 执行

### 新建组件
1. 只能使用 `design-tokens.css` 中定义的 CSS 变量
2. **禁止裸色值** — 永远不要写 `#xxxxxx`、`rgb()`、`hsl()`
3. 默认正文色是 `var(--color-neutral-9)`
4. 卡片用 `var(--color-card-fill)` + `var(--shadow-whisper)`
5. 按钮用 `.btn` / `.btn--primary` / `.btn--secondary` 等全局类
6. 标题用 `<h1>`-`<h4>` 或 `var(--font-serif)` + `font-weight: 500`
7. 字体族用 `var(--font-sans)` / `var(--font-serif)` / `var(--font-mono)`
8. 字号用 `var(--text-copy-14)` 等 token，禁止 `font-size: 15px`

### 修改样式
1. 先读 `CHEATSHEET.md` 确认 token 用法
2. 检查组件是否用了裸色值 → 替换为 token
3. 检查 `font-weight: bold` 在中文字段 → 改为 500
4. 检查硬阴影 → 改为 whisper 或 ring

### Token 审计
1. 扫描目标文件中的裸色值（`#xxxxxx`）、`font-weight: bold`、`box-shadow` 透明度 > 0.1
2. 输出行号和替换建议

## Step 3 · 验证

```bash
# 构建检查
cd frontend && npm run build
```

## 文件位置

| 文件 | 路径 |
|------|------|
| Token 定义 | `frontend/src/styles/tokens/design-tokens.css` |
| 速查表 | `frontend/src/styles/tokens/CHEATSHEET.md` |
| 全局基础样式 | `frontend/src/styles/global-base.css` |
| 本 Skill | `frontend/src/styles/tokens/SKILL.md` |

## 禁止事项

- ❌ 裸色值出现在任何 `.vue` 或 `.css` 中
- ❌ `font-weight: bold` / `font-bold` 用于中文
- ❌ 硬阴影（`box-shadow` 透明度 > 0.1）
- ❌ 圆角 > 24px
- ❌ 强调色作正文颜色
- ❌ inline `style=""` 中写颜色/字体
