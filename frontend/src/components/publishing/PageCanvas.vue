<script setup lang="ts">
defineProps<{
  sheetNumber: number
}>()
</script>

<template>
  <div class="page-canvas">
    <div class="book-page">
      <!-- SVG decoration layer -->
      <svg
        class="page-svg"
        viewBox="0 0 210 297"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- 版框 -->
        <rect
          x="15"
          y="20"
          width="180"
          height="257"
          fill="none"
          stroke="#c43a31"
          stroke-width="0.5"
        />

        <!-- 版缝中缝 -->
        <line
          x1="105"
          y1="20"
          x2="105"
          y2="277"
          stroke="#c43a31"
          stroke-width="0.3"
          stroke-dasharray="4 4"
        />

        <!-- 上对鱼尾 -->
        <polygon
          points="100,26 105,32 110,26"
          fill="#1a1a1a"
        />
        <polygon
          points="100,32 105,38 110,32"
          fill="#1a1a1a"
        />

        <!-- 下对鱼尾 -->
        <polygon
          points="100,262 105,268 110,262"
          fill="#1a1a1a"
        />
        <polygon
          points="100,268 105,274 110,268"
          fill="#1a1a1a"
        />

        <!-- 页码 -->
        <text
          x="105"
          y="288"
          text-anchor="middle"
          font-size="4"
          fill="#999"
          font-family="serif"
        >
          {{ sheetNumber }}
        </text>
      </svg>

      <!-- Content placeholder -->
      <div class="page-content">
        <p class="content-placeholder">
          第 {{ sheetNumber }} 页 / 点击自动排版生成内容
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8e0d5;
  padding: 24px;
  overflow: auto;
}

.book-page {
  position: relative;
  width: 210mm;
  aspect-ratio: 210 / 297;
  max-width: 100%;
  max-height: calc(100vh - 120px);
  background: #fffdf8;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.page-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.page-content {
  position: absolute;
  top: 22px;
  left: 18px;
  right: 15px;
  bottom: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-placeholder {
  color: #ccc;
  font-size: 14px;
  font-family: serif;
  text-align: center;
}
</style>