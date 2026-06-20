<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { usePublicationStore } from '../../stores/publication'

const auth = useAuthStore()
const pubStore = usePublicationStore()

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
      <view class="login-card__icon">谱</view>
      <text class="login-card__title">归源族谱</text>
      <text class="login-card__subtitle">登录后查看和编辑您的家族族谱</text>
      <button class="login-btn" :loading="auth.loading" @tap="handleLogin">
        微信登录
      </button>
    </view>

    <!-- 已登录 -->
    <view v-else>
      <view class="header">
        <text class="header__greeting">您好，{{ auth.username || '宗亲' }}</text>
        <text class="header__sub">您可访问的族谱</text>
      </view>

      <!-- 加载中 -->
      <view v-if="pubStore.loading" class="loading">
        <text>加载中…</text>
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
            <text class="pub-card__title">《{{ pub.title }}》</text>
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

.login-card {
  margin-top: 200rpx;
  padding: 60rpx 40rpx;
  background: #fff9ef;
  border-radius: 24rpx;
  text-align: center;
  box-shadow: 0 8rpx 40rpx rgba(0,0,0,0.08);
}

.login-card__icon {
  width: 120rpx;
  height: 120rpx;
  margin: 0 auto 24rpx;
  background: linear-gradient(135deg, #7f342b, #c43a31);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  font-weight: 700;
  color: #fff;
  font-family: serif;
}

.login-card__title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #241a10;
  margin-bottom: 12rpx;
}

.login-card__subtitle {
  display: block;
  font-size: 26rpx;
  color: #8a6845;
  margin-bottom: 48rpx;
}

.login-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #7f342b, #c43a31);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
}

.header {
  padding: 40rpx 0 24rpx;
}

.header__greeting {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.header__sub {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.7);
  margin-top: 8rpx;
}

.pub-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.pub-card {
  padding: 28rpx 32rpx;
  background: #fff9ef;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
}

.pub-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.pub-card__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #241a10;
  font-family: serif;
}

.pub-card__role {
  font-size: 22rpx;
  color: #ab6d30;
  background: rgba(171,109,48,0.1);
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  font-weight: 600;
}

.pub-card__subtitle {
  display: block;
  font-size: 24rpx;
  color: #8a6845;
  margin-bottom: 8rpx;
}

.pub-card__time {
  display: block;
  font-size: 22rpx;
  color: #b89a78;
}

.loading {
  text-align: center;
  padding: 80rpx 0;
  color: #8a6845;
}

.error-tip {
  padding: 20rpx 24rpx;
  background: rgba(239,68,68,0.08);
  border-radius: 12rpx;
  color: #dc2626;
  font-size: 26rpx;
  margin-bottom: 20rpx;
}

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
  font-size: 30rpx;
  color: #241a10;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.empty__hint {
  display: block;
  font-size: 24rpx;
  color: #8a6845;
}
</style>
