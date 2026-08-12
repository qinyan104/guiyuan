<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { adminBackupDatabase, adminListUsers, type AdminUser } from '../api/admin'
import { isAdmin, isSuperAdmin } from '../api/auth'
import { createPublication, listPublications, type PublicationSummary } from '../api/publication'
import FeedbackStrip from '../components/FeedbackStrip.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { useFeedback } from '../composables/useFeedback'
import { blankPublication, defaultSettings } from '../data/sampleFamily'

const router = useRouter()
const feedback = useFeedback()

const pubCount = ref(0)
const userCount = ref(0)
const users = ref<AdminUser[]>([])
const recentPubs = ref<PublicationSummary[]>([])
const loading = ref(true)
const pageError = ref<string | null>(null)

async function loadDashboard() {
  loading.value = true
  pageError.value = null
  try {
    const pubs = await listPublications()
    pubCount.value = pubs.length
    recentPubs.value = pubs.slice(0, 5)

    if (isAdmin()) {
      try {
        const adminUsers = await adminListUsers()
        userCount.value = adminUsers.length
        users.value = adminUsers
      } catch {
        userCount.value = 0
        users.value = []
      }
    }
  } catch (e: any) {
    pageError.value = e?.message || '加载失败，请检查后端服务是否正常运行'
    pubCount.value = 0
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)

function openPublication(id: number) {
  router.push({ name: 'workbench', params: { id } })
}

const backupLoading = ref(false)
async function handleBackup() {
  backupLoading.value = true
  try {
    await adminBackupDatabase()
  } catch (err: any) {
    feedback.setError('备份失败: ' + (err.message || '未知错误'))
  } finally {
    backupLoading.value = false
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const latestPub = computed(() => recentPubs.value.length > 0 ? recentPubs.value[0] : null)
const otherRecentPubs = computed(() => recentPubs.value.slice(1))
const visibleUsers = computed(() => users.value.slice(0, 3))
const hasMoreUsers = computed(() => users.value.length > visibleUsers.value.length)

const showCreateDialog = ref(false)
const newTitle = ref('')
const newSubtitle = ref('')

async function handleCreateFromDashboard() {
  const title = newTitle.value.trim() || '未命名族谱'
  try {
    const id = await createPublication({ ...blankPublication, title, subtitle: newSubtitle.value.trim() }, defaultSettings, title)
    router.push({ name: 'workbench', params: { id } })
  } catch (err: any) {
    feedback.setError('创建失败: ' + (err.message || '未知错误'))
  }
}
</script>

<template>
  <div class="dashboard-view-root">
    <FeedbackStrip :status-message="feedback.statusMessage.value" :error-message="feedback.errorMessage.value" @dismiss="feedback.dismiss" />

    <header class="dashboard-intro">
      <div>
        <h1>今天，先把家人的故事往前推进一点。</h1>
        <p>从一次补充、一张照片或一个被想起的名字开始，让家谱慢慢完整。</p>
      </div>
      <button class="create-button" @click="showCreateDialog = true">
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
          <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
        新建一份家谱
      </button>
    </header>

    <div v-if="loading" class="state-stage" role="status">
      <span class="state-spinner" aria-hidden="true"></span>
      <p>正在打开你的家谱…</p>
    </div>

    <section v-else-if="pageError" class="state-stage state-stage--error" role="alert">
      <div class="state-symbol" aria-hidden="true">!</div>
      <h2>暂时没能打开家谱</h2>
      <p>{{ pageError }}</p>
      <button class="btn btn--primary" @click="loadDashboard">重新加载</button>
    </section>

    <template v-else-if="pubCount > 0 && latestPub">
      <section class="dashboard-grid" aria-label="家谱概览">
        <article class="continue-record" tabindex="0" @click="openPublication(latestPub.id)" @keydown.enter="openPublication(latestPub.id)">
          <div class="continue-record__background" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="continue-record__content">
            <p class="record-label">上次整理</p>
            <h2>{{ latestPub.title || '未命名族谱' }}</h2>
            <p class="record-subtitle">{{ latestPub.subtitle || '从这里继续补全家人的故事。' }}</p>
            <div class="record-footer">
              <span>{{ formatDate(latestPub.updatedAt) }} 更新</span>
              <button class="continue-button" @click.stop="openPublication(latestPub.id)">
                继续整理
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </article>

        <aside class="library-summary">
          <p>馆藏总卷数</p>
          <strong>{{ pubCount }}</strong>
          <span>份家谱正在被认真维护</span>
          <button class="text-button" @click="router.push({ name: 'publications' })">
            查看全部 <span aria-hidden="true">→</span>
          </button>
        </aside>

        <section class="recent-records">
          <div class="section-heading">
            <h2>最近打开</h2>
            <button class="text-button" @click="router.push({ name: 'publications' })">所有家谱 <span aria-hidden="true">→</span></button>
          </div>
          <div v-if="otherRecentPubs.length" class="recent-list">
            <button v-for="pub in otherRecentPubs" :key="pub.id" class="recent-item" @click="openPublication(pub.id)">
              <span class="recent-item__date">{{ formatDate(pub.updatedAt) }}</span>
              <span class="recent-item__title">{{ pub.title || '未命名族谱' }}</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
          <p v-else class="recent-empty">还没有其他家谱。从这一份开始慢慢留下来。</p>
        </section>

        <button class="start-record" @click="showCreateDialog = true">
          <span class="start-record__mark" aria-hidden="true">+</span>
          <span>
            <strong>从一个新名字开始</strong>
            <small>创建一份新的家谱</small>
          </span>
        </button>
      </section>

      <section v-if="isAdmin()" class="admin-space">
        <div>
          <h2>管理空间</h2>
          <p>协作成员与平台维护，在这里保持清楚有序。</p>
        </div>
        <div class="admin-space__actions">
          <button class="admin-action" @click="router.push({ name: 'admin-users' })">
            <span>
              <strong>{{ userCount }} 位成员</strong>
              <small>管理协作权限</small>
            </span>
            <div class="avatar-stack" aria-hidden="true">
              <UserAvatar
                v-for="user in visibleUsers"
                :key="user.id"
                :src="user.avatarUrl"
                :name="user.nickname || user.username"
                :tone="user.role.toLowerCase()"
                size="sm"
              />
              <span v-if="hasMoreUsers" class="avatar-more">+</span>
            </div>
          </button>
          <button v-if="isSuperAdmin()" class="admin-action" :disabled="backupLoading" @click="handleBackup">
            <span>
              <strong>{{ backupLoading ? '正在备份…' : '数据备份' }}</strong>
              <small>归档当前平台数据</small>
            </span>
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v10m0 0 4-4m-4 4-4-4M4 16h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </section>
    </template>

    <section v-else class="empty-stage">
      <div class="empty-stage__copy">
        <h1>从你熟悉的一个名字开始。</h1>
        <p>不需要一次记全。先写下一个人，等下次和家人聊天时，再把新的故事补进来。</p>
        <button class="btn btn--primary" @click="showCreateDialog = true">
          创建第一份家谱
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <div class="empty-tree" aria-hidden="true">
        <span class="empty-tree__line empty-tree__line--one"></span>
        <span class="empty-tree__line empty-tree__line--two"></span>
        <span class="empty-tree__node empty-tree__node--one"></span>
        <span class="empty-tree__node empty-tree__node--two"></span>
        <span class="empty-tree__node empty-tree__node--three"></span>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="base-dialog">
        <div v-if="showCreateDialog" class="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="create-publication-title" @click.self="showCreateDialog = false" @keydown.escape="showCreateDialog = false">
          <div class="dialog-panel" tabindex="-1">
            <p class="dialog-context">新家谱</p>
            <h2 id="create-publication-title">给这份记忆起个名字</h2>
            <p class="dialog-description">从这里进入工作台，第一位家人可以之后再慢慢补上。</p>
            <label for="publication-title">族谱名称</label>
            <input id="publication-title" v-model="newTitle" placeholder="例如：陈氏家族记忆" @keyup.enter="handleCreateFromDashboard" />
            <label for="publication-subtitle">副标题 <span>可选</span></label>
            <input id="publication-subtitle" v-model="newSubtitle" placeholder="例如：我们这一支的故事" @keyup.enter="handleCreateFromDashboard" />
            <div class="dialog-actions">
              <button class="btn btn--ghost" @click="showCreateDialog = false">暂不创建</button>
              <button class="btn btn--primary" @click="handleCreateFromDashboard">开始整理</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.dashboard-view-root {
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 26px clamp(20px, 3vw, 42px) 56px;
}

.dashboard-intro {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 44px;
}

.dashboard-intro h1,
.empty-stage h1,
.dialog-panel h2,
.continue-record h2,
.section-heading h2,
.admin-space h2 {
  color: var(--color-neutral-10);
  font-family: var(--font-serif);
  font-weight: 500;
}

.dashboard-intro h1 {
  max-width: 16ch;
  margin-bottom: 14px;
  font-size: clamp(30px, 3vw, 44px);
  line-height: 1.26;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.dashboard-intro p {
  max-width: 45ch;
  color: var(--color-neutral-7);
  font-size: var(--text-copy-15);
  line-height: 1.75;
}

.create-button,
.continue-button,
.text-button,
.recent-item,
.start-record,
.admin-action {
  font: inherit;
}

.create-button,
.continue-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  color: var(--color-text-on-accent);
  background: var(--color-accent-gradient);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-accent);
  font-size: var(--text-copy-14);
  font-weight: 500;
  transition: transform var(--duration-fast) var(--ease-spring-gentle), box-shadow var(--duration-fast) var(--ease-breath);
}

.create-button:hover,
.continue-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 34px color-mix(in srgb, var(--color-accent) 24%, transparent);
}

.create-button svg,
.continue-button svg,
.recent-item svg,
.btn svg,
.admin-action > svg {
  width: 18px;
  height: 18px;
}

.state-stage {
  display: grid;
  place-items: center;
  min-height: 420px;
  padding: 48px;
  color: var(--color-neutral-7);
  text-align: center;
}

.state-spinner {
  width: 28px;
  height: 28px;
  margin-bottom: 14px;
  border: 2px solid var(--color-neutral-4);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: dash-spin 750ms linear infinite;
}

.state-stage--error { align-content: center; }
.state-stage--error h2 { margin: 14px 0 8px; font-family: var(--font-serif); font-weight: 500; }
.state-stage--error p { max-width: 46ch; margin-bottom: 22px; }
.state-symbol { display: grid; place-items: center; width: 38px; height: 38px; color: var(--color-error); border: 1px solid var(--color-error); border-radius: 50%; font-family: var(--font-serif); font-size: var(--text-title-20); }

@keyframes dash-spin { to { transform: rotate(360deg); } }

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.28fr) minmax(250px, 0.72fr);
  grid-template-areas:
    'continue summary'
    'recent start';
  gap: 18px;
}

.continue-record,
.library-summary,
.recent-records,
.start-record {
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-xl);
}

.continue-record {
  position: relative;
  grid-area: continue;
  min-height: 360px;
  overflow: hidden;
  color: #f9f5ec;
  background: #171512;
  cursor: pointer;
  outline: none;
  transition: transform var(--duration-normal) var(--ease-spring-gentle), box-shadow var(--duration-normal) var(--ease-breath);
}

.continue-record:hover,
.continue-record:focus-visible { transform: translateY(-3px); box-shadow: 0 22px 48px rgba(28, 26, 23, 0.16); }

.continue-record__background { position: absolute; inset: 0; opacity: 0.85; }
.continue-record__background span { position: absolute; width: 10px; height: 10px; border: 1px solid rgba(249, 245, 236, 0.44); border-radius: 50%; }
.continue-record__background span::after { content: ''; position: absolute; top: 4px; left: 9px; width: 148px; height: 1px; background: linear-gradient(90deg, rgba(249, 245, 236, 0.4), transparent); transform-origin: left; }
.continue-record__background span:nth-child(1) { top: 18%; right: 20%; }
.continue-record__background span:nth-child(2) { top: 44%; right: 43%; }
.continue-record__background span:nth-child(2)::after { width: 108px; transform: rotate(-32deg); }
.continue-record__background span:nth-child(3) { bottom: 23%; right: 14%; width: 13px; height: 13px; border-color: rgba(217, 85, 69, 0.9); box-shadow: 0 0 0 6px rgba(217, 85, 69, 0.1); }
.continue-record__background span:nth-child(3)::after { width: 132px; transform: rotate(171deg); }
.continue-record__background span:nth-child(4) { bottom: 12%; right: 54%; }
.continue-record__background span:nth-child(4)::after { width: 105px; transform: rotate(-10deg); }

.continue-record__content { position: relative; z-index: 1; display: flex; flex-direction: column; min-height: inherit; max-width: 61%; padding: clamp(26px, 4vw, 42px); }
.record-label { margin-bottom: 28px; color: rgba(249, 245, 236, 0.6); font-size: var(--text-label-12); }
.continue-record h2 { margin-bottom: 10px; color: #f9f5ec; font-size: clamp(28px, 3vw, 42px); line-height: 1.25; letter-spacing: -0.02em; overflow-wrap: anywhere; }
.record-subtitle { color: rgba(249, 245, 236, 0.65); font-size: var(--text-copy-14); line-height: 1.7; }
.record-footer { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-top: auto; }
.record-footer > span { color: rgba(249, 245, 236, 0.6); font-size: var(--text-label-12); }
.continue-button { min-height: 40px; padding: 0 13px; }

.library-summary {
  display: flex;
  grid-area: summary;
  flex-direction: column;
  align-items: flex-start;
  min-height: 360px;
  padding: 30px;
  color: var(--color-neutral-9);
  background: var(--color-neutral-2);
}

.library-summary > p { color: var(--color-neutral-7); font-size: var(--text-label-12); }
.library-summary strong { margin-top: auto; color: var(--color-neutral-10); font-family: var(--font-serif); font-size: clamp(58px, 7vw, 88px); font-weight: 500; line-height: 0.9; letter-spacing: -0.04em; }
.library-summary > span { margin-top: 10px; color: var(--color-neutral-7); font-size: var(--text-copy-13); }

.text-button { display: inline-flex; align-items: center; gap: 6px; width: fit-content; margin-top: 25px; padding: 0 0 4px; color: var(--color-neutral-8); border-bottom: 1px solid var(--color-accent); font-size: var(--text-copy-13); font-weight: 500; transition: color var(--duration-fast) var(--ease-breath); }
.text-button:hover { color: var(--color-neutral-10); }
.text-button span { color: var(--color-accent); transition: transform var(--duration-fast) var(--ease-spring-gentle); }
.text-button:hover span { transform: translateX(3px); }

.recent-records { grid-area: recent; min-height: 232px; padding: 26px 28px; background: var(--color-neutral-1); }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.section-heading h2, .admin-space h2 { font-size: var(--text-title-20); }
.section-heading .text-button { margin-top: 0; }
.recent-list { display: grid; margin-top: 16px; }
.recent-item { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto; align-items: center; gap: 12px; width: 100%; min-height: 42px; padding: 7px 0; color: var(--color-neutral-9); border-top: 1px solid var(--color-neutral-4); text-align: left; transition: color var(--duration-fast) var(--ease-breath), padding var(--duration-fast) var(--ease-spring-gentle); }
.recent-item:hover { padding-left: 5px; color: var(--color-accent-deep); }
.recent-item__date { color: var(--color-neutral-6); font-size: var(--text-label-12); }
.recent-item__title { overflow: hidden; font-size: var(--text-copy-14); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.recent-item svg { color: var(--color-neutral-6); }
.recent-empty { margin-top: 40px; color: var(--color-neutral-7); font-size: var(--text-copy-14); }

.start-record { display: flex; grid-area: start; align-items: center; gap: 15px; min-height: 232px; padding: 28px; color: var(--color-neutral-9); background: color-mix(in srgb, var(--color-accent) 5%, var(--color-neutral-1)); text-align: left; transition: transform var(--duration-fast) var(--ease-spring-gentle), background-color var(--duration-fast) var(--ease-breath); }
.start-record:hover { transform: translateY(-3px); background: color-mix(in srgb, var(--color-accent) 9%, var(--color-neutral-1)); }
.start-record__mark { display: grid; flex: 0 0 auto; place-items: center; width: 35px; height: 35px; color: var(--color-accent-deep); border: 1px solid color-mix(in srgb, var(--color-accent) 42%, transparent); border-radius: 50%; font-size: var(--text-title-24); font-weight: 300; }
.start-record strong, .admin-action strong { display: block; margin-bottom: 5px; color: var(--color-neutral-10); font-family: var(--font-serif); font-size: var(--text-copy-16); font-weight: 500; }
.start-record small, .admin-action small { color: var(--color-neutral-7); font-size: var(--text-label-12); }

.admin-space { display: flex; align-items: center; justify-content: space-between; gap: 34px; margin-top: 18px; padding: 26px 28px; border-top: 1px solid var(--color-neutral-4); }
.admin-space p { margin-top: 7px; color: var(--color-neutral-7); font-size: var(--text-copy-13); }
.admin-space__actions { display: flex; flex: 0 0 auto; gap: 10px; }
.admin-action { display: flex; align-items: center; justify-content: space-between; gap: 28px; min-width: 210px; padding: 13px 14px; color: var(--color-neutral-9); background: var(--color-neutral-2); border: 1px solid var(--color-neutral-4); border-radius: var(--radius-lg); text-align: left; transition: transform var(--duration-fast) var(--ease-spring-gentle), border-color var(--duration-fast) var(--ease-breath); }
.admin-action:hover:not(:disabled) { transform: translateY(-2px); border-color: var(--color-neutral-6); }
.admin-action:disabled { opacity: var(--opacity-disabled); cursor: not-allowed; }
.admin-action > svg { color: var(--color-neutral-6); }
.avatar-stack { display: flex; align-items: center; }
.avatar-stack :deep(.user-avatar) { margin-left: -6px; border: 2px solid var(--color-neutral-2); }
.avatar-stack :deep(.user-avatar:first-child) { margin-left: 0; }
.avatar-more { display: grid; place-items: center; width: 25px; height: 25px; margin-left: -6px; color: var(--color-neutral-7); background: var(--color-neutral-3); border: 2px solid var(--color-neutral-2); border-radius: 50%; font-size: var(--text-caption-10); }

.empty-stage { display: grid; grid-template-columns: minmax(0, 0.86fr) minmax(320px, 0.74fr); align-items: center; gap: clamp(40px, 9vw, 130px); min-height: 530px; padding: 54px clamp(28px, 6vw, 82px); color: var(--color-neutral-9); background: var(--color-neutral-2); border: 1px solid var(--color-neutral-4); border-radius: var(--radius-2xl); }
.empty-stage__copy { max-width: 440px; }
.empty-stage h1 { margin-bottom: 20px; font-size: clamp(34px, 4vw, 52px); line-height: 1.22; letter-spacing: -0.02em; }
.empty-stage p { margin-bottom: 30px; color: var(--color-neutral-7); font-size: var(--text-copy-16); line-height: 1.8; }
.empty-stage .btn { gap: 8px; min-height: 46px; }
.empty-tree { position: relative; min-height: 260px; overflow: hidden; background: #171512; border-radius: var(--radius-xl); }
.empty-tree::before { content: ''; position: absolute; top: 23%; bottom: 22%; left: 50%; width: 1px; background: linear-gradient(rgba(249,245,236,.08), rgba(217,85,69,.88), rgba(249,245,236,.08)); }
.empty-tree__line { position: absolute; top: 49%; left: 50%; width: 32%; height: 1px; background: rgba(249,245,236,.25); transform-origin: left; }
.empty-tree__line--one { transform: rotate(-29deg); }
.empty-tree__line--two { transform: rotate(31deg); }
.empty-tree__node { position: absolute; width: 13px; height: 13px; border: 1px solid rgba(249,245,236,.66); border-radius: 50%; background: #171512; }
.empty-tree__node--one { top: 19%; left: calc(50% - 6px); }
.empty-tree__node--two { bottom: 17%; left: 17%; }
.empty-tree__node--three { right: 17%; bottom: 17%; border-color: rgba(217,85,69,.9); box-shadow: 0 0 0 7px rgba(217,85,69,.1); }

.dialog-overlay { position: fixed; inset: 0; z-index: var(--z-modal); display: grid; place-items: center; padding: 20px; background: var(--color-overlay); backdrop-filter: blur(7px); }
.dialog-panel { width: min(100%, 440px); padding: 28px; background: var(--color-neutral-1); border: 1px solid var(--color-neutral-4); border-radius: var(--radius-2xl); box-shadow: 0 28px 70px rgba(0, 0, 0, 0.22); }
.dialog-context { margin-bottom: 10px; color: var(--color-accent-deep); font-size: var(--text-label-12); font-weight: 500; }
.dialog-panel h2 { margin-bottom: 9px; font-size: var(--text-title-24); }
.dialog-description { margin-bottom: 24px; color: var(--color-neutral-7); font-size: var(--text-copy-14); line-height: 1.7; }
.dialog-panel label { display: flex; justify-content: space-between; margin: 15px 0 7px; color: var(--color-neutral-7); }
.dialog-panel label span { color: var(--color-neutral-6); font-weight: 400; }
.dialog-panel input { min-height: 45px; background: var(--color-neutral-2); border-color: var(--color-neutral-4); }
.dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }

:global([data-theme='dark'] .continue-record),
:global([data-theme='dark'] .empty-tree) { background: #080807; }

@media (max-width: 880px) {
  .dashboard-grid { grid-template-columns: minmax(0, 1fr) minmax(210px, .62fr); }
  .continue-record__content { max-width: 70%; }
  .admin-space { align-items: flex-start; flex-direction: column; }
}

@media (max-width: 680px) {
  .dashboard-view-root { padding: 18px 16px 38px; }
  .dashboard-intro { align-items: flex-start; flex-direction: column; margin-bottom: 30px; }
  .dashboard-grid { grid-template-columns: 1fr; grid-template-areas: 'continue' 'summary' 'recent' 'start'; }
  .continue-record, .library-summary { min-height: 300px; }
  .continue-record__content { max-width: 76%; padding: 28px; }
  .library-summary { min-height: 220px; }
  .library-summary strong { margin-top: 30px; }
  .recent-records, .start-record { min-height: 200px; }
  .admin-space__actions { flex-direction: column; width: 100%; }
  .admin-action { width: 100%; }
  .empty-stage { grid-template-columns: 1fr; min-height: 0; padding: 36px 26px; }
  .empty-tree { min-height: 210px; }
}

@media (prefers-reduced-motion: reduce) {
  .state-spinner { animation: none; }
  .continue-record, .create-button, .continue-button, .start-record, .admin-action, .text-button, .text-button span { transition: none; }
}
</style>
