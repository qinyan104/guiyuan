const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'CollaboratorManager.vue')
let content = fs.readFileSync(filePath, 'utf8')

// Find the old CSS block for accounts (from .section-header to end of .derived-warn)
const cssStart = content.indexOf('.section-header {')
const cssEnd = content.indexOf('.derived-warn {')

if (cssStart === -1 || cssEnd === -1) {
  console.error('CSS markers not found'); process.exit(1)
}

// Find the end of the last rule
let endIdx = cssEnd
let braceDepth = 0
let foundOpen = false
for (let i = cssEnd; i < content.length; i++) {
  if (content[i] === '{') { braceDepth++; foundOpen = true }
  if (content[i] === '}') braceDepth--
  if (foundOpen && braceDepth === 0) { endIdx = i + 1; break }
}

if (endIdx === cssEnd) { console.error('Cannot find CSS rule end'); process.exit(1) }

const before = content.substring(0, cssStart)
const after = content.substring(endIdx)

const newCSS = `.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.accounts-section {
  border-top: 1px solid var(--line-soft);
  padding-top: 16px;
  margin-top: 8px;
}

.section-desc {
  font-size: 12px;
  color: var(--text-soft);
  margin: 4px 0 12px;
  line-height: 1.5;
}

.derive-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.derive-summary {
  font-size: 12px;
  color: var(--text-soft);
}

/* 派生结果提示条 */
.derive-result-strip {
  background: #16a34a10;
  border: 1px solid #16a34a30;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.derive-result-strip.warn {
  background: #f59e0b10;
  border-color: #f59e0b30;
}

.derive-result-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.derive-result-title {
  font-weight: 600;
  font-size: 13px;
}

.derive-result-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-soft);
  padding: 0 4px;
  line-height: 1;
}

.derive-result-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.derive-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.derive-result-name {
  font-weight: 500;
  min-width: 60px;
}

.derive-result-creds {
  display: flex;
  gap: 8px;
}

.creds-code {
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--bg-elevated);
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  user-select: all;
  border: 1px solid var(--line-soft);
}

.creds-code:hover {
  border-color: var(--accent-amber);
  background: #a96e3510;
}

.creds-pw {
  font-weight: 600;
  letter-spacing: 1px;
}

.derive-result-note {
  font-size: 12px;
  color: var(--text-soft);
  margin-top: 8px;
}

/* 账号表格 */
.account-table {
  border: 1px solid var(--line-soft);
  border-radius: 10px;
  overflow: hidden;
}

.account-table-header {
  display: grid;
  grid-template-columns: 1fr 60px 1fr 160px;
  padding: 8px 14px;
  background: var(--bg-elevated);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--line-soft);
}

.account-table-row {
  display: grid;
  grid-template-columns: 1fr 60px 1fr 160px;
  padding: 10px 14px;
  align-items: center;
  font-size: 13px;
  border-bottom: 1px solid var(--line-soft);
}

.account-table-row:last-child {
  border-bottom: none;
}

.row-name {
  font-weight: 500;
}

.gender-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 8px;
  background: var(--bg-elevated);
}

.gender-tag.male {
  color: #3b82f6;
  background: #3b82f610;
}

.gender-tag.female {
  color: #ec4899;
  background: #ec489910;
}

.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}

.status-dot.active {
  background: #16a34a;
}

.status-dot.deceased {
  background: var(--text-soft);
}

.status-dot.none {
  background: #f59e0b;
}

.status-dot.disabled {
  background: #dc2626;
}

.action-placeholder {
  font-size: 12px;
  color: var(--text-soft);
}

.btn--xs {
  font-size: 11px;
  padding: 2px 8px;
  min-width: auto;
}

.btn--xs.danger {
  color: #dc2626;
}

.btn--xs.danger:hover {
  background: #dc262610;
}

/* 重置密码弹窗 */
.reset-pw-container {
  text-align: center;
  padding: 16px 0;
}

.reset-pw-label {
  font-size: 13px;
  color: var(--text-soft);
  margin-bottom: 12px;
}

.reset-pw-code {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 3px;
  background: var(--bg-elevated);
  padding: 12px 24px;
  border-radius: 8px;
  display: inline-block;
  cursor: pointer;
  user-select: all;
  border: 1px dashed var(--line-soft);
}

.reset-pw-code:hover {
  border-color: var(--accent-amber);
  background: #a96e3510;
}

.reset-pw-note {
  font-size: 12px;
  color: var(--text-soft);
  margin-top: 16px;
}

.empty-state-sm {
  text-align: center;
  padding: 16px;
  color: var(--text-soft);
  font-size: 13px;
}
`

content = before + newCSS + after
fs.writeFileSync(filePath, content, 'utf8')
console.log('OK: CSS replaced')
