<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { usePublicationStore, type Person } from '../../stores/publication'

const pubStore = usePublicationStore()

const pubId = ref<number>(0)
const canvasWidth = ref(375)
const canvasHeight = ref(600)
const scale = ref(1)
const panX = ref(0)
const panY = ref(0)
const selectedPersonId = ref<string | null>(null)
const searchQuery = ref('')
const searchResults = ref<Person[]>([])
const showSearch = ref(false)
const showDetail = ref(false)
const selectedPerson = ref<Person | null>(null)

// 简化版布局结果
interface LayoutCard { personId: string; x: number; y: number; w: number; h: number }
interface LayoutLine { x1: number; y1: number; x2: number; y2: number; type: 'parent-child' | 'spousal' }
const layoutCards = ref<LayoutCard[]>([])
const layoutLines = ref<LayoutLine[]>([])

// 获取系统信息
const sysInfo = uni.getSystemInfoSync()
canvasWidth.value = sysInfo.windowWidth
canvasHeight.value = sysInfo.windowHeight - 200

onLoad((options: any) => {
  if (options?.pubId) {
    pubId.value = Number(options.pubId)
    loadAndLayout()
  }
})

async function loadAndLayout() {
  await pubStore.loadTree(pubId.value)
  if (!pubStore.currentPub) return

  nextTick(() => {
    computeLayout()
    drawTree()
  })
}

/**
 * 简化版树布局算法
 * 从左到右：始祖在左，后代在右
 * 每代一列，同代人物纵向排列
 */
function computeLayout() {
  const pub = pubStore.currentPub
  if (!pub) return

  const CARD_W = 200
  const CARD_H = 120
  const COL_GAP = 280
  const ROW_GAP = 30

  // 找出 focusFamilyId 的根人物
  const focusFam = pub.families[pub.focusFamilyId]
  if (!focusFam) return

  // BFS 分代
  const generations: Map<number, string[]> = new Map()
  const personGen = new Map<string, number>()
  const visited = new Set<string>()

  // 从 focus family 的第一个 adult 开始
  const rootId = focusFam.adults[0]
  if (!rootId) return

  const queue: Array<{ id: string; gen: number }> = [{ id: rootId, gen: 0 }]
  visited.add(rootId)

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!
    personGen.set(id, gen)
    if (!generations.has(gen)) generations.set(gen, [])
    generations.get(gen)!.push(id)

    // 找子女
    for (const fam of Object.values(pub.families)) {
      if (fam.adults.includes(id)) {
        for (const childId of fam.children) {
          if (!visited.has(childId)) {
            visited.add(childId)
            queue.push({ id: childId, gen: gen + 1 })
          }
        }
        // 配偶也加入同一世代
        for (const adultId of fam.adults) {
          if (adultId !== id && !visited.has(adultId)) {
            visited.add(adultId)
            personGen.set(adultId, gen)
            if (!generations.has(gen)) generations.set(gen, [])
            generations.get(gen)!.push(adultId)
          }
        }
      }
    }
  }

  // 计算坐标
  const cards: LayoutCard[] = []
  const lines: LayoutLine[] = []
  const personPos = new Map<string, { x: number; y: number }>()

  const maxGen = Math.max(...generations.keys())
  const startY = 40

  for (let gen = 0; gen <= maxGen; gen++) {
    const ids = generations.get(gen) || []
    const x = 60 + gen * COL_GAP
    const totalHeight = ids.length * (CARD_H + ROW_GAP) - ROW_GAP
    let y = startY + (canvasHeight.value - totalHeight) / 2

    for (const id of ids) {
      const card: LayoutCard = { personId: id, x, y, w: CARD_W, h: CARD_H }
      cards.push(card)
      personPos.set(id, { x: x + CARD_W / 2, y: y + CARD_H / 2 })
      y += CARD_H + ROW_GAP
    }
  }

  // 计算连线
  for (const fam of Object.values(pub.families)) {
    for (const adultId of fam.adults) {
      const parentPos = personPos.get(adultId)
      if (!parentPos) continue
      // 配偶连线
      for (const otherAdultId of fam.adults) {
        if (otherAdultId !== adultId) {
          const otherPos = personPos.get(otherAdultId)
          if (otherPos) {
            lines.push({ x1: parentPos.x, y1: parentPos.y, x2: otherPos.x, y2: otherPos.y, type: 'spousal' })
          }
        }
      }
      // 父子连线
      for (const childId of fam.children) {
        const childPos = personPos.get(childId)
        if (childPos) {
          lines.push({ x1: parentPos.x, y1: parentPos.y, x2: childPos.x, y2: childPos.y, type: 'parent-child' })
        }
      }
    }
  }

  layoutCards.value = cards
  layoutLines.value = lines
}

/**
 * Canvas 绘制
 */
function drawTree() {
  const query = uni.createSelectorQuery()
  query.select('#treeCanvas')
    .fields({ node: true, size: true })
    .exec((res) => {
      if (!res?.[0]?.node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = sysInfo.pixelRatio

      canvas.width = canvasWidth.value * dpr
      canvas.height = canvasHeight.value * dpr
      ctx.scale(dpr, dpr)

      // 清空
      ctx.fillStyle = '#f8f4ed'
      ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)

      ctx.save()
      ctx.translate(panX.value, panY.value)
      ctx.scale(scale.value, scale.value)

      const pub = pubStore.currentPub
      if (!pub) return

      // 绘制连线
      for (const line of layoutLines.value) {
        ctx.beginPath()
        ctx.moveTo(line.x1, line.y1)
        ctx.lineTo(line.x2, line.y2)
        ctx.strokeStyle = line.type === 'spousal' ? 'rgba(171,109,48,0.4)' : 'rgba(95,73,50,0.7)'
        ctx.lineWidth = line.type === 'spousal' ? 1.5 : 2
        if (line.type === 'spousal') ctx.setLineDash([6, 4])
        ctx.stroke()
        ctx.setLineDash([])
      }

      // 绘制人物卡片
      for (const card of layoutCards.value) {
        const person = pub.people[card.personId]
        if (!person) continue
        const isSelected = card.personId === selectedPersonId.value
        const isMale = person.gender === 'male'
        const isFemale = person.gender === 'female'

        // 卡片背景
        ctx.fillStyle = isSelected ? '#fff5eb' : '#fff9ef'
        ctx.strokeStyle = isSelected ? '#ab6d30' : '#6f5943'
        ctx.lineWidth = isSelected ? 2.5 : 1.2
        roundRect(ctx, card.x, card.y, card.w, card.h, 8)
        ctx.fill()
        ctx.stroke()

        // 性别色条
        ctx.fillStyle = isMale ? 'rgba(70,130,180,0.18)' : isFemale ? 'rgba(200,100,120,0.18)' : 'rgba(160,160,160,0.12)'
        roundRect(ctx, card.x, card.y, card.w, 32, [8, 8, 0, 0])
        ctx.fill()

        // 姓名
        ctx.fillStyle = '#241a10'
        ctx.font = 'bold 28px "Noto Serif SC", serif'
        ctx.textAlign = 'center'
        ctx.fillText(person.name || '未知', card.x + card.w / 2, card.y + 56)

        // 出生年份
        if (person.birth) {
          ctx.fillStyle = '#8a6845'
          ctx.font = '22px sans-serif'
          ctx.fillText(person.birth, card.x + card.w / 2, card.y + 82)
        }

        // 已故标记
        if (person.deceased) {
          ctx.fillStyle = 'rgba(120,100,80,0.3)'
          ctx.font = '18px sans-serif'
          ctx.fillText('已故', card.x + card.w / 2, card.y + card.h - 12)
        }
      }

      ctx.restore()
    })
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number | number[]) {
  const radii = Array.isArray(r) ? r : [r, r, r, r]
  ctx.beginPath()
  ctx.moveTo(x + radii[0], y)
  ctx.lineTo(x + w - radii[1], y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radii[1])
  ctx.lineTo(x + w, y + h - radii[2])
  ctx.quadraticCurveTo(x + w, y + h, x + w - radii[2], y + h)
  ctx.lineTo(x + radii[3], y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radii[3])
  ctx.lineTo(x, y + radii[0])
  ctx.quadraticCurveTo(x, y, x + radii[0], y)
  ctx.closePath()
}

// 触摸处理
let lastTouchDistance = 0
let lastTouchX = 0
let lastTouchY = 0

function onTouchStart(e: any) {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    lastTouchDistance = Math.sqrt(dx * dx + dy * dy)
  } else if (e.touches.length === 1) {
    lastTouchX = e.touches[0].clientX
    lastTouchY = e.touches[0].clientY
  }
}

function onTouchMove(e: any) {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (lastTouchDistance > 0) {
      const delta = distance / lastTouchDistance
      scale.value = Math.min(3, Math.max(0.3, scale.value * delta))
      drawTree()
    }
    lastTouchDistance = distance
  } else if (e.touches.length === 1) {
    const dx = e.touches[0].clientX - lastTouchX
    const dy = e.touches[0].clientY - lastTouchY
    panX.value += dx
    panY.value += dy
    lastTouchX = e.touches[0].clientX
    lastTouchY = e.touches[0].clientY
    drawTree()
  }
}

function onTouchEnd() {
  lastTouchDistance = 0
}

function onCanvasTap(e: any) {
  const x = (e.detail.x - panX.value) / scale.value
  const y = (e.detail.y - panY.value) / scale.value

  for (const card of layoutCards.value) {
    if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
      selectedPersonId.value = card.personId
      selectedPerson.value = pubStore.getPerson(card.personId) || null
      showDetail.value = true
      drawTree()
      return
    }
  }
  // 点击空白处取消选择
  selectedPersonId.value = null
  showDetail.value = false
  drawTree()
}

function handleSearch() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  searchResults.value = pubStore.findPersonByName(searchQuery.value.trim())
}

function jumpToPerson(personId: string) {
  selectedPersonId.value = personId
  selectedPerson.value = pubStore.getPerson(personId) || null
  showDetail.value = true
  showSearch.value = false
  searchQuery.value = ''
  searchResults.value = []
  drawTree()
}

function closeDetail() {
  showDetail.value = false
}
</script>

<template>
  <view class="tree-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <text class="nav-bar__title">{{ pubStore.currentPub?.title || '族谱' }}</text>
      <view class="nav-bar__actions">
        <text class="nav-btn" @tap="showSearch = !showSearch">🔍</text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view v-if="showSearch" class="search-bar">
      <input
        v-model="searchQuery"
        class="search-input"
        placeholder="输入姓名搜索"
        :focus="showSearch"
        @input="handleSearch"
      />
      <view v-if="searchResults.length > 0" class="search-results">
        <view
          v-for="p in searchResults"
          :key="p.id"
          class="search-result-item"
          @tap="jumpToPerson(p.id)"
        >
          <text class="search-result-name">{{ p.name }}</text>
          <text class="search-result-info">{{ p.birth || '' }}</text>
        </view>
      </view>
    </view>

    <!-- Canvas -->
    <canvas
      id="treeCanvas"
      type="2d"
      :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
      @tap="onCanvasTap"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    />

    <!-- 人物详情面板 -->
    <view v-if="showDetail && selectedPerson" class="detail-panel" @tap.stop>
      <view class="detail-header">
        <text class="detail-name">{{ selectedPerson.name }}</text>
        <text class="detail-close" @tap="closeDetail">✕</text>
      </view>
      <view class="detail-body">
        <view class="detail-row" v-if="selectedPerson.gender">
          <text class="detail-label">性别</text>
          <text class="detail-value">{{ selectedPerson.gender === 'male' ? '男' : selectedPerson.gender === 'female' ? '女' : '未知' }}</text>
        </view>
        <view class="detail-row" v-if="selectedPerson.birth">
          <text class="detail-label">出生</text>
          <text class="detail-value">{{ selectedPerson.birth }}</text>
        </view>
        <view class="detail-row" v-if="selectedPerson.death">
          <text class="detail-label">去世</text>
          <text class="detail-value">{{ selectedPerson.death }}</text>
        </view>
        <view class="detail-row" v-if="selectedPerson.titleName">
          <text class="detail-label">辈分/头衔</text>
          <text class="detail-value">{{ selectedPerson.titleName }}</text>
        </view>
        <view class="detail-row" v-if="selectedPerson.clan">
          <text class="detail-label">堂号</text>
          <text class="detail-value">{{ selectedPerson.clan }}</text>
        </view>
        <view class="detail-row" v-if="selectedPerson.note">
          <text class="detail-label">备注</text>
          <text class="detail-value detail-value--note">{{ selectedPerson.note }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.tree-page {
  min-height: 100vh;
  background: #f8f4ed;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  background: #241a10;
  padding-top: env(safe-area-inset-top);
}

.nav-bar__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  font-family: serif;
}

.nav-btn {
  font-size: 36rpx;
  padding: 8rpx 16rpx;
}

.search-bar {
  padding: 16rpx 24rpx;
  background: #fff9ef;
  border-bottom: 1rpx solid rgba(111,89,67,0.12);
}

.search-input {
  width: 100%;
  height: 72rpx;
  padding: 0 24rpx;
  background: #f0ebe3;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #241a10;
}

.search-results {
  margin-top: 12rpx;
  max-height: 400rpx;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
}

.search-result-item:active {
  background: rgba(171,109,48,0.08);
}

.search-result-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #241a10;
}

.search-result-info {
  font-size: 24rpx;
  color: #8a6845;
}

/* Detail panel */
.detail-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff9ef;
  border-radius: 24rpx 24rpx 0 0;
  box-shadow: 0 -8rpx 40rpx rgba(0,0,0,0.12);
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  z-index: 100;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.detail-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #241a10;
  font-family: serif;
}

.detail-close {
  font-size: 36rpx;
  color: #8a6845;
  padding: 8rpx;
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.detail-row {
  display: flex;
  gap: 16rpx;
}

.detail-label {
  flex-shrink: 0;
  width: 140rpx;
  font-size: 24rpx;
  color: #8a6845;
  font-weight: 600;
}

.detail-value {
  font-size: 28rpx;
  color: #241a10;
}

.detail-value--note {
  font-size: 24rpx;
  line-height: 1.6;
}
</style>
