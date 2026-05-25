<script setup lang="ts">
/**
 * BookPageRenderer — 前端古籍版面渲染器
 *
 * 根据 canvasId（画布模板）和 lineage entries 数据，在前端直接渲染
 * 传统竖排书版版面，前端直接渲染。
 *
 * 支持：
 *  - 12 种画布模板的视觉差异化渲染（纸张纹理、鱼尾、配色等）
 *  - 竖排文字（writing-mode: vertical-rl）
 *  - 世代分组标注
 *  - 版心边框、鱼尾装饰
 */
import { computed } from "vue"
import type { LineageEntry } from "../../types/publishing"
import { CANVAS_TEMPLATES, type CanvasTemplate } from "../../lib/vrainTemplates"

const props = defineProps<{
  entries: LineageEntry[]
  canvasId: string
  pageNumber: number
  totalPages: number
  fontSize?: number
  lineHeight?: number
  columns?: number
}>()

const template = computed<CanvasTemplate>(() =>
  CANVAS_TEMPLATES.find(t => t.id === props.canvasId) ?? CANVAS_TEMPLATES[0]
)

const themeClass = computed(() => `theme-${props.canvasId.replace(/[^a-z0-9_]/g, '_')}`)

const styleVars = computed(() => {
  const fs = props.fontSize ?? 14
  const lh = props.lineHeight ?? 1.9
  const cols = props.columns ?? template.value.columns ?? 5
  return {
    '--bpr-font-size': `${fs}px`,
    '--bpr-line-height': `${lh}`,
    '--bpr-columns': cols,
  }
})

// 按 generation 分组
interface GenGroup {
  generation: number
  entries: LineageEntry[]
}

const generationGroups = computed<GenGroup[]>(() => {
  const groups: GenGroup[] = []
  const seen = new Map<number, number>()
  for (const entry of props.entries) {
    const gen = entry.generation
    if (seen.has(gen)) {
      groups[seen.get(gen)!].entries.push(entry)
    } else {
      seen.set(gen, groups.length)
      groups.push({ generation: gen, entries: [entry] })
    }
  }
  return groups
})

function chineseNum(n: number): string {
  const map = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十']
  return map[n] ?? `第${n}`
}

const pageLabel = computed(() => chineseNum(props.pageNumber))
</script>

<template>
  <div
    :class="['book-page-renderer', themeClass, { 'has-fishtail': template.fishTail }]"
    :style="styleVars"
  >
    <!-- 版框 -->
    <div class="bpr-frame">
      <!-- 鱼尾装饰（上下） -->
      <div v-if="template.fishTail" class="bpr-fishtail bpr-fishtail--top">
        <span class="fishtail-icon">🜃</span>
      </div>

      <!-- 版心上方书口标题 -->
      <div class="bpr-header">
        <span class="bpr-header-title">世系錄</span>
        <span class="bpr-header-page">{{ pageLabel }}</span>
      </div>

      <!-- 正文区域（竖排） -->
      <div class="bpr-body" v-if="entries.length > 0">
        <template v-for="group in generationGroups" :key="group.generation">
          <!-- 世代标记栏 -->
          <div class="bpr-gen-marker">
            <span class="gen-marker-text">第{{ chineseNum(group.generation) }}世</span>
          </div>
          <!-- 条目 -->
          <div
            v-for="entry in group.entries"
            :key="entry.personId"
            :class="['bpr-entry', `bpr-entry--${entry.gender}`]"
          >
            <span class="bpr-entry-name">{{ entry.personName }}</span>
            <span class="bpr-entry-text">{{ entry.formattedText }}</span>
          </div>
        </template>
      </div>

      <!-- 空白状态 -->
      <div v-else class="bpr-empty">
        <span>空頁</span>
      </div>

      <!-- 鱼尾装饰（下） -->
      <div v-if="template.fishTail" class="bpr-fishtail bpr-fishtail--bottom">
        <span class="fishtail-icon">🜄</span>
      </div>

      <!-- 版心底部信息 -->
      <div class="bpr-footer">
        <span class="bpr-footer-tpl">{{ template.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ═══ 基础容器 ═══ */
.book-page-renderer {
  --bpr-bg: #f7f0e4;
  --bpr-text: #2c2418;
  --bpr-frame-color: #8b7355;
  --bpr-accent: #6b4c30;
  --bpr-marker-bg: rgba(107, 76, 48, 0.06);
  --bpr-marker-text: #8b7355;
  --bpr-fishtail-color: #a0896b;
  --bpr-entry-hover: rgba(107, 76, 48, 0.04);
  --bpr-header-bg: rgba(107, 76, 48, 0.03);

  position: relative;
  width: 100%;
  max-width: 700px;
  aspect-ratio: 4 / 3;
  margin: 0 auto;
  border-radius: 4px;
  overflow: hidden;
  font-family: "Noto Serif SC", "SimSun", "STSong", serif;
  color: var(--bpr-text);
  background: var(--bpr-bg);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.12),
    inset 0 0 40px rgba(0, 0, 0, 0.02);
  transition: background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
}

/* ═══ 版框 ═══ */
.bpr-frame {
  position: absolute;
  inset: 24px 32px;
  border: 2px solid var(--bpr-frame-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ═══ 鱼尾 ═══ */
.bpr-fishtail {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  border-bottom: 1px solid var(--bpr-frame-color);
  background: var(--bpr-header-bg);
  color: var(--bpr-fishtail-color);
  font-size: 14px;
  letter-spacing: 4px;
  opacity: 0.7;
}

.bpr-fishtail--bottom {
  border-bottom: none;
  border-top: 1px solid var(--bpr-frame-color);
}

.fishtail-icon {
  font-size: 12px;
  transform: scaleY(1.2);
}

/* ═══ 书口标题（上方） ═══ */
.bpr-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  border-bottom: 1px solid var(--bpr-frame-color);
  background: var(--bpr-header-bg);
  font-size: 11px;
  color: var(--bpr-accent);
}

.bpr-header-title {
  font-weight: 600;
  letter-spacing: 0.12em;
}

.bpr-header-page {
  opacity: 0.6;
}

/* ═══ 正文区域 — 竖排 ═══ */
.bpr-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 14px 10px 8px;
  writing-mode: vertical-rl;
  direction: ltr;
  display: flex;
  gap: 1px;
  font-size: var(--bpr-font-size);
  line-height: var(--bpr-line-height);
}

/* ═══ 世代标记栏 ═══ */
.bpr-gen-marker {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  writing-mode: vertical-rl;
  padding: 8px 3px;
  border-right: 1px solid rgba(139, 115, 85, 0.15);
  background: var(--bpr-marker-bg);
}

.gen-marker-text {
  font-size: 10px;
  color: var(--bpr-marker-text);
  letter-spacing: 0.15em;
  font-weight: 500;
  white-space: nowrap;
}

/* ═══ 条目 ═══ */
.bpr-entry {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 4px;
  border-right: 1px dotted rgba(139, 115, 85, 0.1);
  transition: background 0.15s ease;
  cursor: default;
  min-width: 0;
}

.bpr-entry:hover {
  background: var(--bpr-entry-hover);
}

.bpr-entry-name {
  font-size: calc(var(--bpr-font-size) + 1px);
  font-weight: 600;
  color: var(--bpr-accent);
  white-space: nowrap;
}

.bpr-entry--male .bpr-entry-name {
  color: #4a6741;
}

.bpr-entry--female .bpr-entry-name {
  color: #8b4147;
}

.bpr-entry-text {
  font-size: var(--bpr-font-size);
  color: var(--bpr-text);
  opacity: 0.85;
  word-break: break-all;
}

/* ═══ 空页 ═══ */
.bpr-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--bpr-frame-color);
  opacity: 0.3;
  letter-spacing: 0.5em;
}

/* ═══ 底部 ═══ */
.bpr-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 14px;
  border-top: 1px solid var(--bpr-frame-color);
  font-size: 9px;
  color: var(--bpr-accent);
  opacity: 0.45;
}

/* ════════════════════════════════════════════════════════════
   画布模板主题覆写
   ════════════════════════════════════════════════════════════ */

/* — mr_5 宣纸鱼尾·五栏 — */
.theme-mr_5 {
  --bpr-bg: #f5edd6;
  --bpr-text: #2c2418;
  --bpr-frame-color: #8b7355;
  --bpr-accent: #6b4c30;
  background:
    var(--bpr-bg),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(139,115,85,0.04) 1px,
      rgba(139,115,85,0.04) 2px
    ),
    url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E"),
    radial-gradient(ellipse at 20% 80%, rgba(139,115,85,0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(139,115,85,0.04) 0%, transparent 50%);

}

/* — mr_4 宣纸鱼尾·四栏 — */
.theme-mr_4 {
  --bpr-bg: #f4ecd3;
  --bpr-text: #2c2418;
  --bpr-frame-color: #907a5e;
  --bpr-accent: #705838;
  background:
    var(--bpr-bg),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(139,115,85,0.04) 1px,
      rgba(139,115,85,0.04) 2px
    ),
    url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E"),
    radial-gradient(ellipse at 20% 80%, rgba(139,115,85,0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(139,115,85,0.04) 0%, transparent 50%);

}

/* — 24_paper 宣纸·五栏 — */
.theme-24_paper {
  --bpr-bg: #f3ead0;
  --bpr-text: #33291c;
  --bpr-frame-color: #9a8466;
  --bpr-accent: #6e5434;
  background:
    var(--bpr-bg),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(139,115,85,0.04) 1px,
      rgba(139,115,85,0.04) 2px
    ),
    url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E"),
    radial-gradient(ellipse at 20% 80%, rgba(139,115,85,0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(139,115,85,0.04) 0%, transparent 50%);

}

/* — 28_paper 宣纸·密栏 — */
.theme-28_paper {
  --bpr-bg: #f1e8cc;
  --bpr-text: #33291c;
  --bpr-frame-color: #9a8466;
  --bpr-accent: #6e5434;
  background:
    var(--bpr-bg),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(139,115,85,0.04) 1px,
      rgba(139,115,85,0.04) 2px
    ),
    url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E"),
    radial-gradient(ellipse at 20% 80%, rgba(139,115,85,0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(139,115,85,0.04) 0%, transparent 50%);

}

/* — vintage 复古旧纸 — */
.theme-vintage {
  --bpr-bg: #e8dab8;
  --bpr-text: #3c3020;
  --bpr-frame-color: #8a7050;
  --bpr-accent: #6e5434;
  --bpr-fishtail-color: #8a7050;
  background-image:
    radial-gradient(circle at 30% 20%, rgba(120, 90, 50, 0.06), transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(120, 90, 50, 0.04), transparent 50%);
}

/* — bamboo 竹简 — */
.theme-bamboo {
  --bpr-bg: #e5d9b8;
  --bpr-text: #2a2310;
  --bpr-frame-color: #8a7a4c;
  --bpr-accent: #5c4e2c;
  --bpr-marker-bg: rgba(90, 78, 44, 0.06);
  background-image:
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 18px,
      rgba(120, 100, 50, 0.06) 18px,
      rgba(120, 100, 50, 0.06) 19px
    );
}

/* — 24_black 黑底碑帖 — */
.theme-24_black {
  --bpr-bg: #1a1a18;
  --bpr-text: #d4c8a8;
  --bpr-frame-color: #4a4438;
  --bpr-accent: #c8b888;
  --bpr-marker-bg: rgba(200, 184, 136, 0.04);
  --bpr-marker-text: #a09068;
  --bpr-fishtail-color: #6a6048;
  --bpr-entry-hover: rgba(200, 184, 136, 0.04);
  --bpr-header-bg: rgba(200, 184, 136, 0.03);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.4),
    inset 0 0 60px rgba(0, 0, 0, 0.2);
}
.theme-24_black .bpr-entry--male .bpr-entry-name { color: #a8c498; }
.theme-24_black .bpr-entry--female .bpr-entry-name { color: #c89898; }

/* — 18_blue 靛蓝染色 — */
.theme-18_blue {
  --bpr-bg: #1e2a3a;
  --bpr-text: #c8d4e0;
  --bpr-frame-color: #3a5a7a;
  --bpr-accent: #8ab0d0;
  --bpr-marker-bg: rgba(138, 176, 208, 0.06);
  --bpr-marker-text: #7090b0;
  --bpr-fishtail-color: #5a7a9a;
  --bpr-entry-hover: rgba(138, 176, 208, 0.05);
  --bpr-header-bg: rgba(138, 176, 208, 0.04);
  box-shadow:
    0 2px 8px rgba(0, 20, 60, 0.3),
    inset 0 0 40px rgba(0, 10, 30, 0.15);
}
.theme-18_blue .bpr-entry--male .bpr-entry-name { color: #88c8a8; }
.theme-18_blue .bpr-entry--female .bpr-entry-name { color: #c89898; }

/* — 18_red 朱砂染色 — */
.theme-18_red {
  --bpr-bg: #3a1e1e;
  --bpr-text: #e0c8c0;
  --bpr-frame-color: #7a3a38;
  --bpr-accent: #d09888;
  --bpr-marker-bg: rgba(208, 138, 128, 0.06);
  --bpr-marker-text: #b07068;
  --bpr-fishtail-color: #9a5a58;
  --bpr-entry-hover: rgba(208, 138, 128, 0.05);
  --bpr-header-bg: rgba(208, 138, 128, 0.04);
  box-shadow:
    0 2px 8px rgba(60, 0, 0, 0.3),
    inset 0 0 40px rgba(30, 0, 0, 0.15);
}
.theme-18_red .bpr-entry--male .bpr-entry-name { color: #98c888; }
.theme-18_red .bpr-entry--female .bpr-entry-name { color: #e0a898; }

/* — 20_paper 小幅宣纸 — */
.theme-20_paper {
  --bpr-bg: #f6eede;
  --bpr-text: #2c2418;
  --bpr-frame-color: #a08868;
  --bpr-accent: #705838;
  aspect-ratio: 4 / 3;
  background:
    var(--bpr-bg),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(139,115,85,0.04) 1px,
      rgba(139,115,85,0.04) 2px
    ),
    url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E"),
    radial-gradient(ellipse at 20% 80%, rgba(139,115,85,0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(139,115,85,0.04) 0%, transparent 50%);

}

/* — simple 极简竖版 — */
.theme-simple {
  --bpr-bg: #faf8f4;
  --bpr-text: #333;
  --bpr-frame-color: #ddd;
  --bpr-accent: #666;
  --bpr-marker-bg: rgba(0, 0, 0, 0.015);
  --bpr-marker-text: #999;
  --bpr-header-bg: rgba(0, 0, 0, 0.01);
  aspect-ratio: 3 / 4;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.theme-simple .bpr-frame {
  border-width: 1px;
  border-color: #e0e0e0;
}

/* — iphone15pm 手机屏幕 — */
.theme-iphone15pm {
  --bpr-bg: #f8f0dc;
  --bpr-text: #2c2418;
  --bpr-frame-color: #a08868;
  --bpr-accent: #705838;
  aspect-ratio: 2796 / 1290;
  border-radius: 16px;
  background:
    var(--bpr-bg),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(139,115,85,0.04) 1px,
      rgba(139,115,85,0.04) 2px
    ),
    url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E"),
    radial-gradient(ellipse at 20% 80%, rgba(139,115,85,0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(139,115,85,0.04) 0%, transparent 50%);

}
</style>
