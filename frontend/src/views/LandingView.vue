<script setup lang="ts">
import { onMounted } from 'vue'
import DarkModeToggle from '../components/DarkModeToggle.vue'

onMounted(() => {
  const ob = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('on') }),
    { threshold: 0.1 }
  )
  document.querySelectorAll('.rv').forEach((el) => {
    ob.observe(el)
  })
})
</script>

<template>
  <div class="landing-root">
    <!-- 背景网格与光效 -->
    <div class="landing-ambient-glow" aria-hidden="true"></div>

    <nav class="nav">
      <div class="nav-in">
        <div class="nav-logo">
          <div class="nav-seal">归</div>
          <span class="nav-brand">归源</span>
        </div>
        <div class="nav-actions">
          <DarkModeToggle />
          <router-link to="/dashboard" class="nav-cta">进入系统</router-link>
        </div>
      </div>
    </nav>

    <main class="landing-main">
      <!-- 英雄区 -->
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-meta rv">
            <span class="meta-tag">CHAPTER I</span>
            <span class="hero-meta-line"></span>
            <span class="meta-verse">溯其源 &middot; 归其本</span>
          </div>

          <p class="hero-quote rv rv-d1">
            我们在时间的缝隙中寻找<em>来处</em>，<br />
            在浩瀚的星海里标记<em>归途</em>。<br />
            每一段记忆，都是<em>抵抗遗忘</em>的史诗。
          </p>

          <h1 class="rv rv-d2">万物<em>逆旅</em><br />百代<em>过客</em></h1>
          <router-link to="/dashboard" class="hero-cta rv">开始溯源 &rarr;</router-link>
        </div>
      </section>

      <!-- 诗意过渡 -->
      <div class="poetic-break rv">
        <span class="pb-line">念念不忘 &nbsp;&middot;&nbsp; 必有回响</span>
        <span class="pb-line">生生不息 &nbsp;&middot;&nbsp; 是为归源</span>
      </div>

      <!-- 核心特性（异步版式 Bento） -->
      <section class="sec">
        <div class="w">
          <p class="sec-label rv">WHY GUIYUAN</p>
          <h2 class="sec-title rv">在时间里留下印记</h2>
          <p class="sec-verse rv">桃李春风一杯酒，江湖夜雨十年灯。</p>
          <p class="sec-desc rv">
            纸页泛黄，墨迹褪色，口耳相传的故事终将模糊。于是把它搬进一块无限延展的画布里——让每一个名字都成为鲜活的节点。
          </p>
          
          <div class="bento">
            <div class="bento-card card-large rv">
              <div class="bento-num">01</div>
              <div class="bento-icon">&infin;</div>
              <div class="bento-content">
                <h4>无限画布</h4>
                <p>拖拽缩放，自由布局。三种视觉风格随心切换。画布无限延展，再大的族谱脉络也装得下。</p>
              </div>
            </div>
            
            <div class="bento-card rv rv-d1">
              <div class="bento-num">02</div>
              <div class="bento-icon">称</div>
              <div class="bento-content">
                <h4>称谓推算</h4>
                <p>选择任意两人即刻得出准确关系称谓。涵盖 30+ 种血亲姻亲推算，界面极简直观。</p>
              </div>
            </div>
            
            <div class="bento-card rv rv-d2">
              <div class="bento-num">03</div>
              <div class="bento-icon">枝</div>
              <div class="bento-content">
                <h4>枝脉相连</h4>
                <p>多份档案无缝拼接。不同分支灵活挂载到一起，全局脉络一目了然。</p>
              </div>
            </div>
            
            <div class="bento-card card-large rv rv-d3">
              <div class="bento-num">04</div>
              <div class="bento-icon">传</div>
              <div class="bento-content">
                <h4>代代相传</h4>
                <p>邀请亲友共同维护。编辑者与查看者权限分明，字段级隐私脱敏，记忆永不散佚。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 画布预览 -->
      <section class="sec">
        <div class="w text-center">
          <p class="sec-label rv">PREVIEW</p>
          <h2 class="sec-title rv">一幅画布，联结血脉与温情</h2>
          <p class="sec-verse rv no-border">
            横看成岭侧成峰，远近高低各不同。
          </p>
          <div class="shot rv">
            <img src="/screenshot.png" alt="归源画布预览" />
          </div>
        </div>
      </section>

      <!-- 底部行动区 -->
      <section class="cta-section">
        <div class="w">
          <div class="cta-seal rv">序</div>
          <h2 class="rv">开始书写你们的故事</h2>
          <p class="rv">从第一个名字开始，画出一棵属于你们的大树。</p>
          <p class="cta-verse rv">
            岂曰无谱，与子同抄。
          </p>
          <router-link to="/dashboard" class="hero-cta rv">进入归源 &rarr;</router-link>
        </div>
      </section>

      <!-- 页脚 -->
      <footer class="ft">
        <div class="w ft-grid">
          <div class="ft-col">
            <h4>归源 GUIYUAN</h4>
            <p>数字记忆 &middot; 无限画布</p>
            <p class="ft-poem">溯其源，归其本</p>
          </div>
          <div class="ft-col">
            <h4>项目</h4>
            <a href="https://github.com" target="_blank" rel="noopener">GitHub 仓库</a>
          </div>
          <div class="ft-col">
            <h4>联系方式</h4>
            <a href="mailto:example@qq.com">QQ 邮箱联系</a>
          </div>
        </div>
        <div class="w">
          <p class="ft-copy">&copy; 2026 归源团队 &middot; 传承华夏血脉记忆</p>
        </div>
      </footer>
    </main>
  </div>
</template>

<style scoped>
/* ── 全局页面基础 ── */
.landing-root {
  min-height: 100vh;
  background: var(--bg-landing-gradient);
  color: var(--color-neutral-9);
  font-family: var(--font-sans);
  line-height: var(--leading-copy);
  position: relative;
  overflow-x: hidden;
}

/* 宣纸纤维线条网格 */
.landing-root::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(var(--bg-landing-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--bg-landing-grid) 1px, transparent 1px);
  background-size: 56px 56px;
  background-position: center;
  pointer-events: none;
  z-index: 1;
}

/* 朱砂暗淡径向微光 */
.landing-ambient-glow {
  position: absolute;
  top: -15%;
  right: -10%;
  width: 80vw;
  height: 80vw;
  max-width: 900px;
  background: radial-gradient(circle, var(--bg-landing-glow) 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
  filter: blur(40px);
}

.landing-main {
  position: relative;
  z-index: 2;
}

.w {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 var(--radius-2xl);
}

.text-center {
  text-align: center;
}

.no-border {
  border-left: none !important;
  padding-left: 0 !important;
  text-align: center;
}

/* ── 导航栏 ── */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-overlay);
  padding: 16px var(--radius-2xl);
  background: var(--color-panel-glass-bg);
  border-bottom: 1px solid var(--color-glass-border-shadow);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  height: 64px;
}

.nav-in {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 960px;
  margin: 0 auto;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-seal {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent-gradient);
  border-radius: var(--radius-md);
  font-family: var(--font-serif);
  font-size: var(--text-copy-16);
  font-weight: 500;
  color: var(--color-text-on-accent);
  box-shadow: var(--shadow-accent);
}

.nav-brand {
  font-family: var(--font-serif);
  font-size: var(--text-copy-16);
  font-weight: 500;
  color: var(--color-neutral-10);
  letter-spacing: 0.1em;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-cta {
  padding: 6px 18px;
  border-radius: var(--radius-md);
  background: var(--color-neutral-9);
  color: var(--color-neutral-1);
  font-size: var(--text-label-12);
  font-weight: 500;
  transition: all var(--duration-normal) var(--ease-spring-gentle);
  box-shadow: var(--shadow-whisper);
}

.nav-cta:hover {
  background: var(--color-neutral-10);
  transform: translateY(-1px);
  opacity: 1;
}

/* ── 英雄区 ── */
.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);
  padding: 120px var(--radius-2xl) 80px;
  text-align: center;
}

.hero-inner {
  max-width: 680px;
}

.hero-meta {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
}

.meta-tag {
  font-size: var(--text-caption-10);
  font-weight: 500;
  letter-spacing: 0.18em;
  color: var(--color-accent);
}

.hero-meta-line {
  width: 32px;
  height: 1px;
  background: var(--color-neutral-5);
}

.meta-verse {
  font-size: var(--text-caption-10);
  font-weight: 500;
  letter-spacing: 0.18em;
  color: var(--color-neutral-7);
}

.hero-quote {
  font-family: var(--font-serif);
  font-size: var(--text-copy-16);
  color: var(--color-neutral-8);
  line-height: 2.2;
  font-weight: 300;
  margin-bottom: 56px;
}

.hero-quote em {
  font-style: normal;
  color: var(--color-accent);
  border-bottom: 1px solid var(--color-accent);
  padding-bottom: 2px;
}

.hero h1 {
  font-family: var(--font-serif);
  font-size: clamp(40px, 7vw, 72px);
  font-weight: 500;
  color: var(--color-neutral-10);
  line-height: 1.15;
  letter-spacing: 0.05em;
  margin-bottom: 56px;
}

.hero h1 em {
  font-style: normal;
  color: var(--color-accent);
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 32px;
  border-radius: var(--radius-lg);
  background: var(--color-accent-gradient);
  color: var(--color-text-on-accent);
  font-size: var(--text-copy-15);
  font-weight: 500;
  transition: all var(--duration-normal) var(--ease-spring-gentle);
  box-shadow: var(--shadow-accent);
}

.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(198, 60, 46, 0.22);
  opacity: 1;
}

/* ── 诗意过渡 ── */
.poetic-break {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 64px 0;
  color: var(--color-neutral-6);
  font-family: var(--font-serif);
  font-size: var(--text-copy-14);
  letter-spacing: 0.1em;
  line-height: 2;
  text-align: center;
}

.pb-line {
  position: relative;
  display: inline-block;
}

/* ── 板块通用 ── */
.sec {
  padding: 80px 0;
  border-top: 1px solid var(--color-neutral-4);
}

.sec-label {
  font-size: var(--text-caption-10);
  font-weight: 500;
  letter-spacing: 0.16em;
  color: var(--color-accent);
  margin-bottom: 12px;
}

.sec-title {
  font-family: var(--font-serif);
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 500;
  color: var(--color-neutral-10);
  margin-bottom: 16px;
  letter-spacing: 0.03em;
}

.sec-verse {
  font-family: var(--font-serif);
  font-size: var(--text-copy-15);
  color: var(--color-warning);
  font-style: italic;
  line-height: 2;
  margin-bottom: 24px;
  padding-left: 16px;
  border-left: 2px solid var(--color-warning);
}

.sec-desc {
  font-size: var(--text-copy-15);
  color: var(--color-neutral-7);
  max-width: 54ch;
  margin-bottom: 48px;
  line-height: 1.85;
}

/* ── 异步 Bento 布局 ── */
.bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 40px;
}

.bento-card {
  background: var(--color-card-fill);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  padding: 32px;
  position: relative;
  overflow: hidden;
  transition: all var(--duration-normal) var(--ease-spring-gentle);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 220px;
}

.bento-card:hover {
  background: var(--color-card-hover-fill);
  transform: translateY(-4px);
  box-shadow: var(--shadow-whisper), var(--shadow-ring);
  border-color: var(--color-neutral-5);
}

/* 首尾卡片跨列，实现韵律版式 */
.card-large {
  grid-column: span 2;
}

.bento-num {
  font-family: var(--font-serif);
  font-size: 48px;
  font-weight: 500;
  color: var(--color-neutral-4);
  position: absolute;
  top: 16px;
  right: 24px;
  line-height: 1;
  opacity: 0.5;
  transition: color var(--duration-normal);
}

.bento-card:hover .bento-num {
  color: var(--color-accent-muted);
}

.bento-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-neutral-3);
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 500;
  color: var(--color-accent);
  margin-bottom: 24px;
  transition: background var(--duration-normal);
}

.bento-card:hover .bento-icon {
  background: var(--color-accent-muted);
}

.bento-content h4 {
  font-size: var(--text-copy-16);
  font-weight: 500;
  color: var(--color-neutral-10);
  margin-bottom: 8px;
  letter-spacing: 0.02em;
}

.bento-content p {
  font-size: var(--text-copy-13);
  color: var(--color-neutral-7);
  line-height: 1.7;
}

/* ── 预览卡片 ── */
.shot {
  margin-top: 48px;
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--color-card-stroke);
  box-shadow: var(--shadow-whisper);
}

.shot img {
  width: 100%;
  display: block;
}

/* ── 行动召唤区 ── */
.cta-section {
  padding: 96px 0;
  text-align: center;
  border-top: 1px solid var(--color-neutral-4);
  position: relative;
}

.cta-seal {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent-gradient);
  border-radius: var(--radius-md);
  font-family: var(--font-serif);
  font-size: var(--text-title-28);
  font-weight: 500;
  color: var(--color-text-on-accent);
  margin: 0 auto 32px;
  box-shadow: var(--shadow-accent);
}

.cta-section h2 {
  font-family: var(--font-serif);
  font-size: clamp(28px, 4vw, 36px);
  font-weight: 500;
  color: var(--color-neutral-10);
  margin-bottom: 16px;
  letter-spacing: 0.05em;
}

.cta-section p {
  font-size: var(--text-copy-15);
  color: var(--color-neutral-7);
  margin-bottom: 16px;
}

.cta-verse {
  font-family: var(--font-serif);
  font-size: var(--text-copy-14);
  color: var(--color-warning);
  font-style: italic;
  margin-bottom: 48px;
  line-height: 2;
}

/* ── 页脚 ── */
.ft {
  padding: 80px 0 48px;
  border-top: 1px solid var(--color-neutral-4);
}

.ft-grid {
  display: flex;
  justify-content: space-between;
  gap: 64px;
  flex-wrap: wrap;
  margin-bottom: 48px;
}

.ft-col {
  flex: 1;
  min-width: 180px;
}

.ft-col h4 {
  font-family: var(--font-serif);
  font-size: var(--text-copy-14);
  font-weight: 500;
  color: var(--color-neutral-10);
  margin-bottom: 16px;
  letter-spacing: 0.02em;
}

.ft-col p,
.ft-col a {
  font-size: var(--text-label-12);
  color: var(--color-neutral-7);
  line-height: 2.2;
}

.ft-col a {
  display: inline-block;
  color: var(--color-neutral-7);
  transition: color var(--duration-fast);
}

.ft-col a:hover {
  color: var(--color-accent);
  opacity: 1;
}

.ft-poem {
  font-family: var(--font-serif);
  font-size: var(--text-copy-13);
  color: var(--color-neutral-6);
  font-style: italic;
  margin-top: 12px;
}

.ft-copy {
  font-size: var(--text-caption-10);
  color: var(--color-neutral-6);
  border-top: 1px solid var(--color-neutral-4);
  padding-top: 24px;
}

/* ── 滚入曝光动效 ── */
.rv {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity var(--duration-slow) var(--ease-spring-gentle),
              transform var(--duration-slow) var(--ease-spring-gentle);
}

.rv.on {
  opacity: 1;
  transform: translateY(0);
}

.rv-d1 {
  transition-delay: 100ms;
}

.rv-d2 {
  transition-delay: 200ms;
}

.rv-d3 {
  transition-delay: 300ms;
}

/* ── 响应式适配 ── */
@media (max-width: 900px) {
  .bento {
    grid-template-columns: 1fr 1fr;
  }
  .card-large {
    grid-column: span 2;
  }
  .hero h1 {
    font-size: clamp(32px, 8vw, 56px);
  }
}

@media (max-width: 640px) {
  .bento {
    grid-template-columns: 1fr;
  }
  .card-large {
    grid-column: span 1;
  }
  .ft-grid {
    flex-direction: column;
    gap: 32px;
  }
  .hero {
    padding: 100px var(--radius-lg) 60px;
  }
  .hero-quote {
    font-size: var(--text-copy-15);
    line-height: 2;
  }
}
</style>




