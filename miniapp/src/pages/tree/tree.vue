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

// 布局结果
interface LayoutCard { personId: string; x: number; y: number; w: number; h: number }
interface LayoutLine { x1: number; y1: number; x2: number; y2: number; type: 'parent-child' | 'spousal' }
const layoutCards = ref<LayoutCard[]>([])
const layoutLines = ref<LayoutLine[]>([])

// 系统信息
const sysInfo = uni.getSystemInfoSync()
canvasWidth.value = sysInfo.windowWidth
canvasHeight.value = sysInfo.windowHeight - sysInfo.statusBarHeight - 88

// 颜色方案
const COLORS = {
  bg: '#f8f4ed',
  cardBg: '#fff9ef',
  cardBgSelected: '#fff5eb',
  cardStroke: '#d4c4a8',
  cardStrokeSelected: '#ab6d30',
  maleHeader: 'rgba(70,108,144,0.12)',
  femaleHeader: 'rgba(180,90,90,0.12)',
  unknownHeader: 'rgba(140,140,140,0.08)',
  nameText: '#241a10',
  infoText: '#8a6845',
  mutedText: '#b89a78',
  lineParentChild: 'rgba(95,73,50,0.5)',
  lineSpousal: 'rgba(171,109,48,0.35)',
  dotColor: '#ab6d30',
}

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
 * 树布局算法：始祖在左，后代向右展开
 */
function computeLayout() {
  const pub = pubStore.currentPub
  if (!pub) return

  const CARD_W = 180
  const CARD_H = 110
  const COL_GAP = 260
  const ROW_GAP = 24

  const focusFam = pub.families[pub.focusFamilyId]
  if (!focusFam) return

  const rootId = focusFam.adults[0]
  if (!rootId) return

  // BFS 分代
  const generations: Map<number, string[]> = new Map()
  const personGen = new Map<string, number>()
  const visited = new Set<string>()
  const queue: Array<{ id: string; gen: number }> = [{ id: rootId, gen: 0 }]
  visited.add(rootId)

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!
    personGen.set(id, gen)
    if (!generations.has(gen)) generations.set(gen, [])
    generations.get(gen)!.push(id)

    for (const fam of Object.values(pub.families)) {
      if (fam.adults.includes(id)) {
        for (const childId of fam.children) {
          if (!visited.has(childId)) {
            visited.add(childId)
            queue.push({ id: childId, gen: gen + 1 })
          }
        }
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
    const x = 50 + gen * COL_GAP
    const totalHeight = ids.length * (CARD_H + ROW_GAP) - ROW_GAP
    let y = startY + Math.max(0, (canvasHeight.value - totalHeight) / 2)

    for (const id of ids) {
      cards.push({ personId: id, x, y, w: CARD_W, h: CARD_H })
      personPos.set(id, { x: x + CARD_W / 2, y: y + CARD_H / 2 })
      y += CARD_H + ROW_GAP
    }
  }

  // 连线
  for (const fam of Object.values(pub.families)) {
    const adultPositions = fam.adults
      .map((id) => personPos.get(id))
      .filter(Boolean) as Array<{ x: number; y: number }>

    // 配偶连线（横向虚线）
    if (adultPositions.length >= 2) {
      lines.push({
        x1: adultPositions[0].x, y1: adultPositions[0].y,
        x2: adultPositions[1].x, y2: adultPositions[1].y,
        type: 'spousal',
      })
    }

    // 父子连线（用折线）
    for (const adultId of fam.adults) {
      const parentPos = personPos.get(adultId)
      if (!parentPos) continue
      for (const childId of fam.children) {
        const childPos = personPos.get(childId)
        if (childPos) {
          lines.push({
            x1: parentPos.x, y1: parentPos.y,
            x2: childPos.x, y2: childPos.y,
            type: 'parent-child',
          })
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

      // 背景
      ctx.fillStyle = COLORS.bg
      ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)

      ctx.save()
      ctx.translate(panX.value, panY.value)
      ctx.scale(scale.value, scale.value)

      const pub = pubStore.currentPub
      if (!pub) { ctx.restore(); return }

      // ── 绘制连线 ──
      for (const line of layoutLines.value) {
        ctx.beginPath()
        if (line.type === 'spousal') {
          // 配偶：虚线
          ctx.setLineDash([8, 5])
          ctx.strokeStyle = COLORS.lineSpousal
          ctx.lineWidth = 1.5
          ctx.moveTo(line.x1, line.y1)
          ctx.lineTo(line.x2, line.y2)
        } else {
          // 父子：折线（水平 → 垂直 → 水平）
          const midX = (line.x1 + line.x2) / 2
          ctx.strokeStyle = COLORS.lineParentChild
          ctx.lineWidth = 1.8
          ctx.moveTo(line.x1, line.y1)
          ctx.lineTo(midX, line.y1)
          ctx.lineTo(midX, line.y2)
          ctx.lineTo(line.x2, line.y2)
        }
        ctx.stroke()
        ctx.setLineDash([])

        // 连线中点小圆点
        if (line.type === 'parent-child') {
          const midX = (line.x1 + line.x2) / 2
          const midY = (line.y1 + line.y2) / 2
          ctx.beginPath()
          ctx.arc(midX, midY, 3, 0, Math.PI * 2)
          ctx.fillStyle = COLORS.dotColor
          ctx.fill()
        }
      }

      // ── 绘制人物卡片 ──
      for (const card of layoutCards.value) {
        const person = pub.people[card.personId]
        if (!person) continue
        const isSelected = card.personId === selectedPersonId.value

        // 卡片阴影
        ctx.save()
        ctx.shadowColor = isSelected ? 'rgba(171,109,48,0.2)' : 'rgba(0,0,0,0.06)'
        ctx.shadowBlur = isSelected ? 16 : 8
        ctx.shadowOffsetY = isSelected ? 4 : 2

        // 卡片背景
        ctx.fillStyle = isSelected ? COLORS.cardBgSelected : COLORS.cardBg
        roundRect(ctx, card.x, card.y, card.w, card.h, 12)
        ctx.fill()
        ctx.restore()

        // 卡片边框
        ctx.strokeStyle = isSelected ? COLORS.cardStrokeSelected : COLORS.cardStroke
        ctx.lineWidth = isSelected ? 2 : 1
        roundRect(ctx, card.x, card.y, card.w, card.h, 12)
        ctx.stroke()

        // 顶部色条
        const isMale = person.gender === 'male'
        const isFemale = person.gender === 'female'
        ctx.fillStyle = isMale ? COLORS.maleHeader : isFemale ? COLORS.femaleHeader : COLORS.unknownHeader
        roundRectTop(ctx, card.x, card.y, card.w, 36, 12)
        ctx.fill()

        // 姓名
        ctx.fillStyle = COLORS.nameText
        ctx.font = 'bold 26px "Noto Serif SC", serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(person.name || '未知', card.x + card.w / 2, card.y + 60)

        // 生卒信息
        if (person.birth || person.death) {
          ctx.fillStyle = COLORS.infoText
          ctx.font = '20px sans-serif'
          const info = [person.birth, person.death].filter(Boolean).join(' - ')
          ctx.fillText(info, card.x + card.w / 2, card.y + 85)
        }

        // 已故标记
        if (person.deceased) {
          ctx.fillStyle = COLORS.mutedText
          ctx.font = '16px sans-serif'
          ctx.fillText('已故', card.x + card.w / 2, card.y + card.h - 14)
        }
      }

      ctx.restore()
    })
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function roundRectTop(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ── 手势处理 ──
let lastTouchDistance = 0
let lastTouchX = 0
let lastTouchY = 0
let isDragging = false

function onTouchStart(e: any) {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    lastTouchDistance = Math.sqrt(dx * dx + dy * dy)
  } else if (e.touches.length === 1) {
    lastTouchX = e.touches[0].clientX
    lastTouchY = e.touches[0].clientY
    isDragging = false
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
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true
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
  if (isDragging) return
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
  selectedPersonId.value = null
  showDetail.value = false
  drawTree()
}

// ── 搜索 ──
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

  // 平移到该人物
  const card = layoutCards.value.find((c) => c.personId === personId)
  if (card) {
    panX.value = canvasWidth.value / 2 - (card.x + card.w / 2) * scale.value
    panY.value = canvasHeight.value / 2 - (card.y + card.h / 2) * scale.value
  }
  drawTree()
}

function closeDetail() {
  showDetail.value = false
}

function resetView() {
  scale.value = 1
  panX.value = 0
  panY.value = 0
  drawTree()
}

function getGenderLabel(g: string) {
  return g === 'male' ? '男' : g === 'female' ? '女' : '未知'
}
</script>

<template>
  <view class="tree-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-bar__left">
        <text class="nav-back" @tap="uni.navigateBack()">←</text>
        <text class="nav-bar__title">{{ pubStore.currentPub?.title || '族谱' }}</text>
      </view>
      <view class="nav-bar__actions">
        <text class="nav-btn" @tap="showSearch = !showSearch">🔍</text>
        <text class="nav-btn" @tap="resetView">⊕</text>
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

    <!-- 缩放提示 -->
    <view class="zoom-hint" v-if="scale !== 1">
      <text class="zoom-hint__text">{{ Math.round(scale * 100) }}%</text>
    </view>

    <!-- 人物详情面板 -->
    <view v-if="showDetail && selectedPerson" class="detail-overlay" @tap="closeDetail">
      <view class="detail-panel" @tap.stop>
        <view class="detail-header">
          <view class="detail-header__left">
            <text class="detail-name">{{ selectedPerson.name }}</text>
            <text class="detail-gender" :class="selectedPerson.gender === 'female' ? 'detail-gender--f' : 'detail-gender--m'">
              {{ getGenderLabel(selectedPerson.gender) }}
            </text>
          </view>
          <text class="detail-close" @tap="closeDetail">✕</text>
        </view>
        <view class="detail-body">
          <view class="detail-row" v-if="selectedPerson.birth">
            <text class="detail-label">出生</text>
            <text class="detail-value">{{ selectedPerson.birth }}</text>
          </view>
          <view class="detail-row" v-if="selectedPerson.death">
            <text class="detail-label">去世</text>
            <text class="detail-value">{{ selectedPerson.death }}</text>
          </view>
          <view class="detail-row" v-if="selectedPerson.age">
            <text class="detail-label">年龄</text>
            <text class="detail-value">{{ selectedPerson.age }}</text>
          </view>
          <view class="detail-row" v-if="selectedPerson.titleName">
            <text class="detail-label">辈分</text>
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
          <view class="detail-row" v-if="selectedPerson.deceased">
            <text class="detail-label">状态</text>
            <text class="detail-value">已故</text>
          </view>
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

/* ── 导航栏 ── */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  background: #241a10;
  padding-top: env(safe-area-inset-top);
}

.nav-bar__left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.nav-back {
  font-size: 36rpx;
  color: rgba(255,255,255,0.8);
  padding: 8rpx;
}

.nav-bar__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  font-family: serif;
}

.nav-bar__actions {
  display: flex;
  gap: 8rpx;
}

.nav-btn {
  font-size: 32rpx;
  padding: 10rpx 16rpx;
  color: rgba(255,255,255,0.8);
}

/* ── 搜索栏 ── */
.search-bar {
  padding: 16rpx 24rpx;
  background: #fff9ef;
  border-bottom: 1rpx solid rgba(111,89,67,0.1);
}

.search-input {
  width: 100%;
  height: 72rpx;
  padding: 0 24rpx;
  background: #f0ebe3;
  border-radius: 16rpx;
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
  border-radius: 12rpx;
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

/* ── 缩放提示 ── */
.zoom-hint {
  position: fixed;
  bottom: 180rpx;
  right: 24rpx;
  padding: 8rpx 20rpx;
  background: rgba(36,26,16,0.75);
  border-radius: 999rpx;
  z-index: 50;
}

.zoom-hint__text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 600;
}

/* ── 详情面板 ── */
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0,0,0,0.25);
}

.detail-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff9ef;
  border-radius: 28rpx 28rpx 0 0;
  box-shadow: 0 -12rpx 48rpx rgba(0,0,0,0.12);
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid rgba(111,89,67,0.1);
}

.detail-header__left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.detail-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #241a10;
  font-family: serif;
}

.detail-gender {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  font-weight: 600;
}

.detail-gender--m {
  background: rgba(70,108,144,0.1);
  color: #4a6c90;
}

.detail-gender--f {
  background: rgba(180,90,90,0.1);
  color: #a05a5a;
}

.detail-close {
  font-size: 36rpx;
  color: #b89a78;
  padding: 8rpx;
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.detail-row {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
}

.detail-label {
  flex-shrink: 0;
  width: 100rpx;
  font-size: 24rpx;
  color: #8a6845;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.detail-value {
  font-size: 28rpx;
  color: #241a10;
  line-height: 1.6;
}

.detail-value--note {
  font-size: 24rpx;
  color: #6b5035;
}
</style>
