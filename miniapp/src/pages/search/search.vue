<script setup lang="ts">
import { ref } from 'vue'
import { usePublicationStore, type Person } from '../../stores/publication'

const pubStore = usePublicationStore()
const query = ref('')
const results = ref<Person[]>([])

function doSearch() {
  const q = query.value.trim()
  if (!q) { results.value = []; return }
  results.value = pubStore.findPersonByName(q)
}

function viewPerson(person: Person) {
  // 跳转到族谱树页面并定位到该人物
  if (pubStore.currentPubId) {
    uni.navigateTo({ url: `/pages/tree/tree?pubId=${pubStore.currentPubId}&focusPerson=${person.id}` })
  }
}
</script>

<template>
  <view class="page">
    <view class="search-box">
      <input
        v-model="query"
        class="search-input"
        placeholder="输入姓名搜索族谱成员"
        confirm-type="search"
        @confirm="doSearch"
        @input="doSearch"
      />
    </view>

    <view v-if="results.length > 0" class="results">
      <view v-for="p in results" :key="p.id" class="result-card" @tap="viewPerson(p)">
        <view class="result-main">
          <text class="result-name">{{ p.name }}</text>
          <text class="result-gender">{{ p.gender === 'male' ? '♂' : p.gender === 'female' ? '♀' : '' }}</text>
        </view>
        <text class="result-info">
          {{ p.birth ? '生于 ' + p.birth : '' }}{{ p.death ? ' · 卒于 ' + p.death : '' }}
        </text>
        <text v-if="p.note" class="result-note">{{ p.note }}</text>
      </view>
    </view>

    <view v-else-if="query.trim()" class="empty">
      <text>未找到匹配的成员</text>
    </view>

    <view v-else class="hint">
      <text class="hint__icon">🔍</text>
      <text class="hint__text">输入姓名即可搜索</text>
      <text class="hint__sub">支持部分匹配，如输入"张"可找到所有张姓成员</text>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
}

.search-box {
  margin-bottom: 24rpx;
}

.search-input {
  width: 100%;
  height: 80rpx;
  padding: 0 28rpx;
  background: #fff9ef;
  border: 2rpx solid rgba(111,89,67,0.15);
  border-radius: 16rpx;
  font-size: 30rpx;
  color: #241a10;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.result-card {
  padding: 24rpx 28rpx;
  background: #fff9ef;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}

.result-card:active {
  background: #f0ebe3;
}

.result-main {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.result-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #241a10;
  font-family: serif;
}

.result-gender {
  font-size: 28rpx;
  color: #8a6845;
}

.result-info {
  font-size: 24rpx;
  color: #8a6845;
}

.result-note {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #b89a78;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty, .hint {
  text-align: center;
  padding: 120rpx 40rpx;
  color: #8a6845;
  font-size: 28rpx;
}

.hint__icon {
  font-size: 64rpx;
  display: block;
  margin-bottom: 20rpx;
}

.hint__text {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #241a10;
  margin-bottom: 12rpx;
}

.hint__sub {
  display: block;
  font-size: 24rpx;
}
</style>
