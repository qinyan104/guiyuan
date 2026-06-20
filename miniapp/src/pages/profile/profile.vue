<script setup lang="ts">
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

async function handleLogin() {
  try {
    await auth.login()
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (err: any) {
    uni.showToast({ title: err.message || '登录失败', icon: 'none' })
  }
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '退出后需要重新登录才能查看族谱',
    success: (res) => {
      if (res.confirm) {
        auth.doLogout()
        uni.showToast({ title: '已退出', icon: 'success' })
      }
    },
  })
}
</script>

<template>
  <view class="page">
    <!-- 已登录 -->
    <view v-if="auth.loggedIn" class="profile-card">
      <view class="avatar">
        <text class="avatar-text">{{ (auth.username || '谱').charAt(0) }}</text>
      </view>
      <text class="username">{{ auth.username || '宗亲' }}</text>
      <text class="role">族谱成员</text>

      <view class="actions">
        <button class="action-btn" @tap="handleLogout">退出登录</button>
      </view>
    </view>

    <!-- 未登录 -->
    <view v-else class="login-card">
      <view class="avatar avatar--guest">
        <text class="avatar-text">谱</text>
      </view>
      <text class="login-title">登录归源</text>
      <text class="login-sub">登录后查看和编辑您的家族族谱</text>
      <button class="login-btn" :loading="auth.loading" @tap="handleLogin">
        微信登录
      </button>
    </view>

    <!-- 关于 -->
    <view class="about">
      <text class="about-title">关于归源</text>
      <text class="about-text">归源是一款专业的族谱管理系统，支持多人协作编辑、传统排版出版、亲属称谓计算等功能。</text>
      <text class="about-version">小程序版本 1.0.0</text>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 32rpx;
}

.profile-card, .login-card {
  padding: 48rpx 32rpx;
  background: #fff9ef;
  border-radius: 24rpx;
  text-align: center;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
  margin-bottom: 32rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  margin: 0 auto 20rpx;
  background: linear-gradient(135deg, #7f342b, #c43a31);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar--guest {
  background: linear-gradient(135deg, #6d5740, #8a6845);
}

.avatar-text {
  font-size: 48rpx;
  font-weight: 700;
  color: #fff;
  font-family: serif;
}

.username {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #241a10;
  margin-bottom: 8rpx;
}

.role {
  display: block;
  font-size: 24rpx;
  color: #8a6845;
}

.login-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #241a10;
  margin-bottom: 8rpx;
}

.login-sub {
  display: block;
  font-size: 26rpx;
  color: #8a6845;
  margin-bottom: 40rpx;
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

.actions {
  margin-top: 32rpx;
}

.action-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: #f0ebe3;
  color: #8a6845;
  font-size: 28rpx;
  border-radius: 12rpx;
  border: none;
}

.about {
  padding: 32rpx;
  background: #fff9ef;
  border-radius: 24rpx;
}

.about-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #241a10;
  margin-bottom: 12rpx;
}

.about-text {
  display: block;
  font-size: 24rpx;
  color: #8a6845;
  line-height: 1.8;
  margin-bottom: 12rpx;
}

.about-version {
  display: block;
  font-size: 22rpx;
  color: #b89a78;
}
</style>
