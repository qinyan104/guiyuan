<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  const ob = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('on') }),
    { threshold: 0.1 }
  )
  document.querySelectorAll('.rv').forEach((el) => ob.observe(el))
})
</script>

<template>
  <div class="landing-root">
    <nav class="nav">
      <div class="nav-in">
        <div class="nav-logo">
          <div class="nav-seal">归</div>
          <span class="nav-brand">归 源</span>
        </div>
        <router-link to="/dashboard" class="nav-cta">进入系统</router-link>
      </div>
    </nav>

    <main>
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-meta rv">
            <span>CHAPTER I</span>
            <span class="hero-meta-line"></span>
            <span>溯其源 &middot; 归其本</span>
          </div>

          <p class="hero-quote rv rv-d1">
            我们在时间的缝隙中寻找<em>来处</em>，<br>
            在浩瀚的星海里标记<em>归途</em>。<br>
            每一段记忆，都是<em>抵抗遗忘</em>的史诗。
          </p>

          <h1 class="rv rv-d2">万物<em>逆旅</em><br>百代<em>过客</em></h1>
          <router-link to="/dashboard" class="hero-cta rv">开始溯源 &rarr;</router-link>
        </div>
      </section>

      <div class="poetic-break rv">
        念念不忘 &nbsp;&middot;&nbsp; 必有回响<br>
        生生不息 &nbsp;&middot;&nbsp; 是为归源
      </div>

      <section class="sec">
        <div class="w">
          <p class="sec-label rv">WHY GUIYUAN</p>
          <h2 class="sec-title rv">在时间里留下印记</h2>
          <p class="sec-verse rv">桃李春风一杯酒，江湖夜雨十年灯。</p>
          <p class="sec-desc rv">
            纸页泛黄，墨迹褪色，口耳相传的故事终将模糊。<br>
            于是把它搬进一块无限延展的画布里——<br>
            让每一个名字都成为鲜活的节点，让每一段故事都找到来路与归途。
          </p>
          <div class="bento">
            <div class="bento-card rv">
              <div class="bento-num">01</div>
              <div class="bento-icon">&infin;</div>
              <h4>无限画布</h4>
              <p>拖拽缩放，自由布局。三种视觉风格随心切换。画布无限延展，再大的脉络也装得下。</p>
            </div>
            <div class="bento-card rv rv-d1">
              <div class="bento-num">02</div>
              <div class="bento-icon">称</div>
              <h4>称谓推算</h4>
              <p>选任意两人即刻知道该怎么称呼。涵盖 30+ 种血亲姻亲称谓，见面不尴尬，称呼不犯错。</p>
            </div>
            <div class="bento-card rv rv-d2">
              <div class="bento-num">03</div>
              <div class="bento-icon">枝</div>
              <h4>枝脉相连</h4>
              <p>多份档案无缝拼接。不同分支灵活挂载到一起，全局脉络一目了然。</p>
            </div>
            <div class="bento-card rv rv-d3">
              <div class="bento-num">04</div>
              <div class="bento-icon">传</div>
              <h4>代代相传</h4>
              <p>邀请亲友共同维护。编辑者与查看者权限分明，记忆永不散佚，故事代代延续。</p>
            </div>
          </div>
        </div>
      </section>

      <section class="sec">
        <div class="w" style="text-align:center">
          <p class="sec-label rv">PREVIEW</p>
          <h2 class="sec-title rv">一块画布，看见所有联结</h2>
          <p class="sec-verse rv" style="text-align:center;border-left:none;padding-left:0">
            横看成岭侧成峰，远近高低各不同。
          </p>
          <div class="shot rv">
            <img src="/screenshot.png" alt="归源画布预览">
          </div>
        </div>
      </section>

      <section class="cta-section">
        <div class="w">
          <div class="cta-seal rv">序</div>
          <h2 class="rv">开始书写你们的故事</h2>
          <p class="rv">从第一个名字开始，画出一棵属于你们的大树。</p>
          <p class="cta-verse rv">
            岂曰无衣，与子同袍；<br>
            岂曰无谱，与子同抄。
          </p>
          <router-link to="/dashboard" class="hero-cta rv">进入归源 &rarr;</router-link>
        </div>
      </section>

      <footer class="ft">
        <div class="w ft-grid">
          <div class="ft-col">
            <h4>归源 GUIYUAN</h4>
            <p>数字记忆 &middot; 无限画布</p>
            <p class="ft-poem">溯其源，归其本</p>
          </div>
          <div class="ft-col"><h4>项目</h4><a href="https://github.com" target="_blank" rel="noopener">GitHub</a></div>
          <div class="ft-col"><h4>联系</h4><a href="mailto:example@qq.com">QQ 邮箱</a></div>
        </div>
        <div class="w"><p class="ft-copy">&copy; 2026 归源</p></div>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.landing-root { min-height: 100vh; background: var(--color-neutral-1); color: var(--color-neutral-9); font-family: var(--font-sans); line-height: 1.6; -webkit-font-smoothing: antialiased; }
.w { max-width: 960px; margin: 0 auto; padding: 0 40px; }

.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 16px 40px; }
.nav-in { display: flex; justify-content: space-between; align-items: center; max-width: 960px; margin: 0 auto; }
.nav-logo { display: flex; align-items: center; gap: 10px; }
.nav-seal { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8b2c26, var(--color-accent)); border-radius: 8px; font-family: var(--font-serif); font-size: 18px; font-weight: 900; color: #fff; }
.nav-brand { font-family: var(--font-serif); font-size: 18px; font-weight: 700; color: var(--color-neutral-10); letter-spacing: 0.06em; }
.nav-cta { padding: 8px 20px; border-radius: 10px; background: var(--color-neutral-9); color: #fff; font-size: 13px; font-weight: 600; text-decoration: none; letter-spacing: 0.02em; transition: all 0.2s; }
.nav-cta:hover { background: var(--color-neutral-10); transform: translateY(-1px); }

.hero { display: flex; align-items: center; justify-content: center; min-height: 90vh; padding: 120px 40px; text-align: center; }
.hero-inner { max-width: 680px; }
.hero-meta { display: flex; justify-content: center; align-items: center; gap: 12px; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; color: var(--color-neutral-6); margin-bottom: 64px; }
.hero-meta span:first-child { color: var(--color-accent); }
.hero-meta-line { width: 40px; height: 1px; background: var(--color-neutral-4); }

.hero-quote { font-family: var(--font-serif); font-size: 18px; color: var(--color-neutral-8); line-height: 2.2; font-weight: 300; margin-bottom: 72px; }
.hero-quote em { font-style: normal; color: var(--color-accent); font-weight: 400; }
.hero h1 { font-family: var(--font-serif); font-size: clamp(48px, 8vw, 80px); font-weight: 900; color: var(--color-neutral-10); line-height: 1.12; letter-spacing: 0.03em; margin-bottom: 56px; }
.hero h1 em { font-style: normal; color: var(--color-accent); }
.hero-cta { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; border-radius: 12px; background: linear-gradient(135deg, #8b2c26, var(--color-accent)); color: #fff; font-size: 15px; font-weight: 700; text-decoration: none; letter-spacing: 0.02em; transition: all 0.2s; box-shadow: 0 8px 24px rgba(196, 58, 49, 0.2); }
.hero-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(196, 58, 49, 0.3); }

.poetic-break { text-align: center; padding: 48px 0; color: var(--color-neutral-4); font-family: var(--font-serif); font-size: 14px; font-style: italic; letter-spacing: 0.08em; line-height: 2.4; }

.sec { padding: 80px 0; }
.sec + .sec { border-top: 1px solid var(--color-neutral-3); }
.sec-label { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--color-accent); margin-bottom: 12px; }
.sec-title { font-family: var(--font-serif); font-size: clamp(22px, 3vw, 30px); font-weight: 700; color: var(--color-neutral-10); margin-bottom: 12px; letter-spacing: 0.02em; }
.sec-desc { font-size: 15px; color: var(--color-neutral-7); max-width: 48ch; margin-bottom: 56px; line-height: 1.85; }
.sec-verse { font-family: var(--font-serif); font-size: 15px; color: var(--color-neutral-6); font-style: italic; line-height: 2; margin-bottom: 40px; padding-left: 16px; border-left: 2px solid var(--color-accent-muted); }

.bento { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.bento-card { background: var(--color-neutral-2); border-radius: 16px; padding: 36px 32px; position: relative; overflow: hidden; transition: all 0.25s; cursor: default; }
.bento-card:hover { background: var(--color-neutral-1); transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06); }
.bento-num { font-family: var(--font-serif); font-size: 48px; font-weight: 900; color: var(--color-accent-muted); position: absolute; top: 12px; right: 20px; line-height: 1; opacity: 0.6; }
.bento-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--color-accent-muted); font-family: var(--font-serif); font-size: 18px; font-weight: 900; color: var(--color-accent); margin-bottom: 16px; }
.bento-card h4 { font-size: 17px; font-weight: 700; color: var(--color-neutral-10); margin-bottom: 6px; }
.bento-card p { font-size: 13px; color: var(--color-neutral-7); line-height: 1.7; }

.shot { margin-top: 56px; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 64px rgba(0, 0, 0, 0.08); }
.shot img { width: 100%; display: block; border-radius: 20px; }

.cta-section { padding: 80px 0; text-align: center; }
.cta-seal { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8b2c26, var(--color-accent)); border-radius: 16px; font-family: var(--font-serif); font-size: 28px; font-weight: 900; color: #fff; margin: 0 auto 24px; box-shadow: 0 16px 40px rgba(196, 58, 49, 0.25); }
.cta-section h2 { font-family: var(--font-serif); font-size: clamp(24px, 3.5vw, 36px); font-weight: 700; color: var(--color-neutral-10); margin-bottom: 12px; }
.cta-section p { font-size: 15px; color: var(--color-neutral-7); margin-bottom: 16px; }
.cta-verse { font-family: var(--font-serif); font-size: 14px; color: var(--color-neutral-6); font-style: italic; margin-bottom: 40px; line-height: 2; }

.ft { padding: 64px 0 40px; border-top: 1px solid var(--color-neutral-3); }
.ft-grid { display: flex; justify-content: space-between; gap: 64px; flex-wrap: wrap; }
.ft-col h4 { font-family: var(--font-serif); font-size: 14px; font-weight: 700; color: var(--color-neutral-10); margin-bottom: 8px; }
.ft-col p, .ft-col a { font-size: 12px; color: var(--color-neutral-6); text-decoration: none; display: block; line-height: 2.2; }
.ft-col a:hover { color: var(--color-accent); }
.ft-copy { font-size: 11px; color: var(--color-neutral-4); padding-top: 24px; }
.ft-poem { font-family: var(--font-serif); font-size: 13px; color: var(--color-neutral-4); font-style: italic; margin-bottom: 8px; line-height: 2; }

.rv { opacity: 0; transform: translateY(16px); transition: opacity 0.8s ease, transform 0.8s ease; }
.rv.on { opacity: 1; transform: translateY(0); }
.rv-d1 { transition-delay: 0.1s; }
.rv-d2 { transition-delay: 0.2s; }
.rv-d3 { transition-delay: 0.3s; }

@media (max-width: 700px) {
  .bento { grid-template-columns: 1fr; }
  .hero h1 { font-size: clamp(36px, 10vw, 56px); }
  .ft-grid { flex-direction: column; gap: 40px; }
}
</style>
