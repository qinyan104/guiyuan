<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { usePublicationStore } from '../../stores/publication'

const auth = useAuthStore()
const pubStore = usePublicationStore()

const shareTokenInput = ref('')
const showShareInput = ref(false)

async function handleLogin() {
  try {
    await auth.login()
    await pubStore.loadPublications()
  } catch (err: any) {
    uni.showToast({ title: err.message || '登录失败', icon: 'none' })
  }
}

function openTree(pubId: number) {
  uni.navigateTo({ url: `/pages/tree/tree?pubId=${pubId}` })
}

function openWithShareToken() {
  const token = shareTokenInput.value.trim()
  if (!token) {
    uni.showToast({ title: '请输入分享码', icon: 'none' })
    return
  }
  // 分享码格式：pubId-token 或纯 token
  // 这里先进入搜索页，携带分享码
  uni.navigateTo({ url: `/pages/search/search?shareToken=${token}` })
}

function onPullDownRefresh() {
  if (auth.loggedIn) {
    pubStore.loadPublications().finally(() => {
      uni.stopPullDownRefresh()
    })
  } else {
    uni.stopPullDownRefresh()
  }
}

onMounted(() => {
  if (auth.loggedIn) {
    pubStore.loadPublications()
  }
})
</script>

<template>
  <view class="page">
    <!-- 未登录 -->
    <view v-if="!auth.loggedIn" class="login-card">
      <view class="login-card__icon">归</view>
      <text class="login-card__title">归源族谱</text>
      <text class="login-card__subtitle">把散落的名字和故事，重新放回同一张图里</text>
      <button class="login-btn" :loading="auth.loading" @tap="handleLogin">
        微信登录
      </button>

      <!-- 分享码入口 -->
      <view class="share-divider">
        <view class="share-divider__line"></view>
        <text class="share-divider__text">或</text>
        <view class="share-divider__line"></view>
      </view>

      <view v-if="!showShareInput" class="share-hint" @tap="showShareInput = true">
        <text class="share-hint__text">我有分享码</text>
      </view>
      <view v-else class="share-input-row">
        <input
          v-model="shareTokenInput"
          class="share-input"
          placeholder="输入分享码"
          confirm-type="go"
          @confirm="openWithShareToken"
        />
        <button class="share-go-btn" @tap="openWithShareToken">查看</button>
      </view>
    </view>

    <!-- 已登录 -->
    <view v-else>
      <view class="header">
        <text class="header__greeting">您好，{{ auth.username || '宗亲' }}</text>
        <text class="header__sub">您可访问的族谱</text>
      </view>

      <!-- 加载中 -->
      <view v-if="pubStore.loading" class="loading">
        <view class="skeleton" v-for="i in 3" :key="i">
          <view class="skeleton__title"></view>
          <view class="skeleton__line"></view>
          <view class="skeleton__line skeleton__line--short"></view>
        </view>
      </view>

      <!-- 错误 -->
      <view v-if="pubStore.error" class="error-tip">
        <text>{{ pubStore.error }}</text>
      </view>

      <!-- 族谱列表 -->
      <view v-if="pubStore.publications.length > 0" class="pub-list">
        <view
          v-for="pub in pubStore.publications"
          :key="pub.id"
          class="pub-card"
          @tap="openTree(pub.id)"
        >
          <view class="pub-card__header">
            <text class="pub-card__title">{{ pub.title }}</text>
            <text class="pub-card__role">{{ pub.accessRole === 'OWNER' ? '谱主' : pub.accessRole === 'EDITOR' ? '协修' : '阅览' }}</text>
          </view>
          <text v-if="pub.subtitle" class="pub-card__subtitle">{{ pub.subtitle }}</text>
          <text class="pub-card__time">最后更新：{{ pub.updatedAt }}</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!pubStore.loading" class="empty">
        <text class="empty__icon">📖</text>
        <text class="empty__text">暂无可访问的族谱</text>
        <text class="empty__hint">请联系谱主授予您访问权限</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 32rpx;
  background: linear-gradient(180deg, #241a10 0%, #3d2b1a 200rpx, #f8f4ed 200rpx);
}

/* ── 登录卡片 ── */
.login-card {
  margin-top: 160rpx;
  padding: 56rpx 40rpx 48rpx;
  background: #fff9ef;
  border-radius: 28rpx;
  text-align: center;
  box-shadow: 0 16rpx 64rpx rgba(0,0,0,0.1);
}

.login-card__icon {
  width: 128rpx;
  height: 128rpx;
  margin: 0 auto 28rpx;
  background: linear-gradient(135deg, #7f342b, #c43a31);
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
  font-weight: 700;
  color: #fff;
  font-family: serif;
  box-shadow: 0 12rpx 40rpx rgba(196,58,49,0.25);
}

.login-card__title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #241a10;
  margin-bottom: 12rpx;
  font-family: serif;
}

.login-card__subtitle {
  display: block;
  font-size: 26rpx;
  color: #8a6845;
  margin-bottom: 48rpx;
  line-height: 1.6;
}

.login-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #7f342b, #c43a31);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 20rpx;
  border: none;
  box-shadow: 0 8rpx 32rpx rgba(196,58,49,0.2);
}

/* ── 分享码区域 ── */
.share-divider {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 36rpx 0 24rpx;
}

.share-divider__line {
  flex: 1;
  height: 1rpx;
  background: rgba(111,89,67,0.12);
}

.share-divider__text {
  font-size: 24rpx;
  color: #b89a78;
}

.share-hint {
  padding: 20rpx;
}

.share-hint__text {
  font-size: 28rpx;
  color: #ab6d30;
  font-weight: 600;
}

.share-input-row {
  display: flex;
  gap: 12rpx;
  align-items: center;
}

.share-input {
  flex: 1;
  height: 80rpx;
  padding: 0 24rpx;
  background: #f5f0e8;
  border: 2rpx solid rgba(111,89,67,0.12);
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #241a10;
}

.share-go-btn {
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 32rpx;
  background: #ab6d30;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
}

/* ── 已登录头部 ── */
.header {
  padding: 40rpx 0 24rpx;
}

.header__greeting {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
  font-family: serif;
}

.header__sub {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.65);
  margin-top: 8rpx;
  letter-spacing: 0.08em;
}

/* ── 骨架屏 ── */
.loading {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.skeleton {
  padding: 28rpx 32rpx;
  background: rgba(255,249,239,0.6);
  border-radius: 20rpx;
}

.skeleton__title {
  width: 60%;
  height: 36rpx;
  background: rgba(111,89,67,0.08);
  border-radius: 8rpx;
  margin-bottom: 16rpx;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton__line {
  width: 90%;
  height: 24rpx;
  background: rgba(111,89,67,0.06);
  border-radius: 6rpx;
  margin-bottom: 10rpx;
  animation: skeleton-pulse 1.5s ease-in-out infinite 0.2s;
}

.skeleton__line--short {
  width: 45%;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── 族谱卡片 ── */
.pub-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.pub-card {
  padding: 32rpx;
  background: #fff9ef;
  border-radius: 24rpx;
  box-shadow: 0 6rpx 28rpx rgba(0,0,0,0.06);
  transition: transform 0.2s ease;
}

.pub-card:active {
  transform: scale(0.98);
}

.pub-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.pub-card__title {
  font-size: 34rpx;
  font-weight: 600;
  color: #241a10;
  font-family: serif;
  flex: 1;
  margin-right: 16rpx;
}

.pub-card__role {
  font-size: 22rpx;
  color: #ab6d30;
  background: rgba(171,109,48,0.1);
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.pub-card__subtitle {
  display: block;
  font-size: 24rpx;
  color: #8a6845;
  margin-bottom: 12rpx;
}

.pub-card__time {
  display: block;
  font-size: 22rpx;
  color: #b89a78;
}

/* ── 错误 ── */
.error-tip {
  padding: 20rpx 24rpx;
  background: rgba(239,68,68,0.08);
  border-radius: 16rpx;
  color: #dc2626;
  font-size: 26rpx;
  margin-bottom: 20rpx;
}

/* ── 空状态 ── */
.empty {
  text-align: center;
  padding: 120rpx 40rpx;
}

.empty__icon {
  font-size: 80rpx;
  display: block;
  margin-bottom: 20rpx;
}

.empty__text {
  display: block;
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.empty__hint {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.6);
}
</style>
