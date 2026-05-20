const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'CollaboratorManager.vue')
let content = fs.readFileSync(filePath, 'utf8')

// Find the accounts section
const sectionStart = content.indexOf('    <!-- 账号派生 -->')
if (sectionStart === -1) { console.error('Section start not found'); process.exit(1) }

// Find where the confirm dialogs section begins (right after accounts section + dialogs)
// Search for: </ConfirmDialog> + newlines + <ConfirmDialog for pendingRoleChange
const roleChangeMarker = 'pendingRoleChange !== null'
const roleChangeIdx = content.indexOf(roleChangeMarker)
if (roleChangeIdx === -1) { console.error('Role change marker not found'); process.exit(1) }

// Find the closing </div> of the root collab-manager before the accounts section start
// Actually, we need to find the boundary between the 3 old dialogs and the start of the remaining dialog
// Go backwards from roleChangeIdx to find the immediately preceding </ConfirmDialog>
const lastDialogClose = content.lastIndexOf('</ConfirmDialog>', roleChangeIdx)
if (lastDialogClose === -1) { console.error('Dialog close not found'); process.exit(1) }

// The section end is right after the 3rd ConfirmDialog closing tag
const sectionEnd = lastDialogClose + '</ConfirmDialog>'.length

const before = content.substring(0, sectionStart)
const after = content.substring(sectionEnd)

const newSection = `    <!-- 账号派生 -->
    <div class="list-section accounts-section">
      <h4 class="section-title">族人账号</h4>
      <p class="section-desc">为族谱中的在世人物创建平台账号，族人可用这些账号登录并维护个人信息。</p>

      <div v-if="accountsError" class="error-strip">
        <span class="icon">⚠️</span>
        <span class="msg">{{ accountsError }}</span>
      </div>

      <div class="derive-controls">
        <button class="btn btn--primary" :disabled="derivingAccounts" @click="handleDeriveAccounts">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          {{ derivingAccounts ? '派生中...' : '派生账号' }}
        </button>
        <span class="derive-summary" v-if="accounts.length > 0">
          共 {{ accounts.length }} 人，<strong>{{ aliveAccounts }}</strong> 人在世
        </span>
      </div>

      <div v-if="showDerivedResult && derivedResult.length > 0" class="derive-result-strip">
        <div class="derive-result-content">
          <span class="derive-result-title">已创建 {{ derivedResult.length }} 个账号</span>
          <button class="derive-result-close" @click="showDerivedResult = false">&times;</button>
        </div>
        <div class="derive-result-list">
          <div v-for="acc in derivedResult" :key="acc.personDbId" class="derive-result-item">
            <span class="derive-result-name">{{ acc.personName }}</span>
            <div class="derive-result-creds">
              <code class="creds-code" @click="copyText(acc.username)" title="点击复制用户名">{{ acc.username }}</code>
              <code class="creds-code creds-pw" @click="copyText(acc.password)" title="点击复制密码">{{ acc.password }}</code>
            </div>
          </div>
        </div>
        <p class="derive-result-note">已将用户名和密码复制到剪切板，请分发给对应族人。</p>
      </div>

      <div v-if="showDerivedResult && derivedResult.length === 0 && !derivingAccounts" class="derive-result-strip warn">
        <div class="derive-result-content">
          <span class="derive-result-title">无需派生</span>
          <button class="derive-result-close" @click="showDerivedResult = false">&times;</button>
        </div>
        <p class="derive-result-note">族谱中所有在世人物已有账号，或没有在世人物需要派生。</p>
      </div>

      <div v-if="accountsLoading" class="loading-state">
        <div class="spinner"></div>
        <span>加载账号列表...</span>
      </div>

      <div v-else-if="accounts.length > 0" class="account-table">
        <div class="account-table-header">
          <span class="col-name">姓名</span>
          <span class="col-gender">性别</span>
          <span class="col-status">状态</span>
          <span class="col-actions">操作</span>
        </div>
        <div v-for="person in accounts" :key="person.personDbId" class="account-table-row">
          <span class="col-name">
            <span class="row-name">{{ person.personName }}</span>
          </span>
          <span class="col-gender">
            <span :class="['gender-tag', person.gender]">{{ person.gender === 'male' ? '男' : person.gender === 'female' ? '女' : '未知' }}</span>
          </span>
          <span class="col-status">
            <template v-if="person.deceased"><span class="status-dot deceased"></span>已故</template>
            <template v-else-if="!person.accountStatus"><span class="status-dot none"></span>未派生</template>
            <template v-else-if="person.accountStatus === 'active'"><span class="status-dot active"></span>{{ person.username }}</template>
            <template v-else><span class="status-dot disabled"></span>已停用</template>
          </span>
          <span class="col-actions">
            <template v-if="person.deceased"><span class="action-placeholder">&mdash;</span></template>
            <template v-else-if="!person.accountStatus"><span class="action-placeholder">等待派生</span></template>
            <template v-else-if="person.accountStatus === 'active'">
              <button class="btn btn--text btn--xs" @click="handleResetPassword(person)">重置密码</button>
              <button class="btn btn--text btn--xs danger" @click="handleToggleAccount(person)">停用</button>
            </template>
            <template v-else>
              <button class="btn btn--text btn--xs" @click="handleToggleAccount(person)">启用</button>
            </template>
          </span>
        </div>
      </div>

      <div v-else-if="!accountsLoading" class="empty-state-sm">
        暂无数据，点击"派生账号"为在世族人创建登录账号。
      </div>
    </div>

    <!-- 重置密码弹窗 -->
    <ConfirmDialog
      :modelValue="showResetDialog"
      :title="\`\${resetPersonName} 的新密码\`"
      tone="info"
      @confirm="showResetDialog = false"
      @cancel="showResetDialog = false"
      @update:model-value="(v: boolean) => showResetDialog = v"
    >
      <div class="reset-pw-container">
        <div class="reset-pw-label">新密码（点击复制）</div>
        <code class="reset-pw-code" @click="copyText(resetPasswordResult ?? '')">{{ resetPasswordResult }}</code>
        <div class="reset-pw-note">请将密码告知该族人，旧密码将立即失效。</div>
      </div>
    </ConfirmDialog>
`

content = before + newSection + after
fs.writeFileSync(filePath, content, 'utf8')
console.log('OK: accounts section replaced')

// Verify balance
const opens = (content.match(/<div /g) || []).length
const closes = (content.match(/<\/div>/g) || []).length
console.log('div opens:', opens, 'closes:', closes, opens === closes ? 'BALANCED' : 'UNBALANCED!')
