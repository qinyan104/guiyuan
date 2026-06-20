<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

let revealObserver: IntersectionObserver | null = null

onMounted(() => {
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('on')
          revealObserver?.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.16 },
  )

  document.querySelectorAll<HTMLElement>('.rv').forEach((element) => {
    revealObserver?.observe(element)
  })
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  revealObserver = null
})
</script>

<template>
  <div class="landing-root">
    <a class="skip-link" href="#main-content">跳到正文</a>

    <nav class="nav">
      <div class="nav-shell">
        <router-link to="/" class="brand" aria-label="归源首页">
          <span class="brand-mark">归</span>
          <span class="brand-copy">
            <strong>归源</strong>
            <small>把名字与故事慢慢连起来</small>
          </span>
        </router-link>

        <div class="nav-links" aria-label="站点导航">
          <a href="#glance">先看一眼</a>
          <a href="#moments">为什么会喜欢</a>
        </div>

        <div class="nav-actions">
          <router-link to="/privacy" class="nav-link">隐私</router-link>
          <router-link to="/login" class="nav-cta">进入整理</router-link>
        </div>
      </div>
    </nav>

    <main id="main-content">
      <section class="hero">
        <div class="hero-shell">
          <div class="hero-copy">
            <p class="eyebrow rv">
              <span>关系整理</span>
              <span class="eyebrow-line"></span>
              <span>记忆留存</span>
            </p>

            <h1 class="rv rv-d1">把散落的名字、关系和旧故事，重新放回同一张图里。</h1>

            <p class="hero-lead rv rv-d2">
              不必一开始就做得很完整。先把重要的人连起来，再慢慢补上照片、称呼、备注和那些后来会想再看一眼的片段。
            </p>

            <div class="hero-actions rv rv-d3">
              <router-link to="/sample/ming" class="primary-btn">先看示例</router-link>
              <router-link to="/login" class="secondary-btn">开始整理</router-link>
            </div>

            <div class="hero-notes rv rv-d4">
              <div>
                <strong>先连关系</strong>
                <span>先看清人与人，再决定补什么。</span>
              </div>
              <div>
                <strong>再补记忆</strong>
                <span>照片、称呼、来处和故事都能放回来。</span>
              </div>
              <div>
                <strong>一起完成</strong>
                <span>不是一个人硬撑着做完，而是慢慢完善。</span>
              </div>
            </div>
          </div>

          <div class="hero-stage rv rv-d2" aria-hidden="true">
            <article class="floating-card floating-card--quote">
              <p>有些名字会变淡，但关系不该失去方向。</p>
            </article>

            <article class="floating-card floating-card--preview">
              <img src="/screenshot.png" alt="归源首页示例预览" />
            </article>

            <article class="floating-card floating-card--poem">
              <span>翻到旧照片时</span>
              <span>你会想知道</span>
              <span>他们后来又走到了哪里</span>
            </article>
          </div>
        </div>
      </section>

      <section id="glance" class="glance-section">
        <div class="section-shell">
          <div class="section-head rv">
            <p class="section-label">先看一眼</p>
            <h2>它不像填表，更像在整理一张会继续生长的关系地图。</h2>
          </div>

          <div class="glance-grid">
            <article class="glance-card glance-card--large rv">
              <p class="glance-index">01</p>
              <h3>画布、人物和预览放在同一个视野里。</h3>
              <p>不用在一层层页面里来回找位置，谁和谁连着、哪里还缺一段，都能很快看明白。</p>
            </article>

            <article class="glance-card rv rv-d1">
              <p class="glance-index">02</p>
              <h3>名字之外，还能留下质感。</h3>
              <p>照片、称呼、备注和零散记忆，会让这件事不只是资料，而更像一份慢慢补写出来的家人档案。</p>
            </article>

            <article class="glance-card glance-card--warm rv rv-d2">
              <p class="glance-index">03</p>
              <h3>整理完成以后，它还能继续被看见。</h3>
              <p>可以分享、可以继续更新，也可以在很多年后再回来，把新的名字和新的故事接上去。</p>
            </article>
          </div>
        </div>
      </section>

      <section id="moments" class="moments-section">
        <div class="section-shell moments-shell">
          <div class="moments-preview rv">
            <img src="/screenshot.png" alt="归源关系整理界面截图" />
          </div>

          <div class="moments-copy">
            <p class="section-label rv">为什么会喜欢</p>
            <h2 class="rv rv-d1">它照顾的不是一份冷冰冰的资料，而是人与人之间本来就该被记住的脉络。</h2>

            <div class="moment-list">
              <article class="moment-item rv rv-d2">
                <strong>“我记得这个称呼，却一下子想不起他和谁连着。”</strong>
                <p>关系先清楚，记忆才有地方落下。</p>
              </article>

              <article class="moment-item rv rv-d3">
                <strong>“我翻到一张旧照片，但不知道照片里的人后来怎样。”</strong>
                <p>图上的每个人，都能继续补回时间与故事。</p>
              </article>

              <article class="moment-item rv rv-d4">
                <strong>“我想留下的不只是名字，还有他们来过的痕迹。”</strong>
                <p>整理到最后，会更像一份值得被传看的记忆作品。</p>
              </article>
            </div>

            <div class="moments-actions rv rv-d4">
              <router-link to="/sample/ming" class="primary-btn">打开示例</router-link>
              <router-link to="/login" class="secondary-btn">从我的内容开始</router-link>
            </div>
          </div>
        </div>
      </section>

      <section class="closing-section rv">
        <div class="closing-shell">
          <p class="section-label">现在开始</p>
          <h2>把重要的人，慢慢放回清楚的位置。</h2>
          <p>先从你最熟悉的几个人开始，剩下的故事，留给之后慢慢补完。</p>
          <div class="closing-actions">
            <router-link to="/login" class="primary-btn">进入整理</router-link>
            <router-link to="/sample/ming" class="secondary-btn">先看示例</router-link>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.landing-root {
  position: relative;
  min-height: 100dvh;
  color: var(--color-neutral-9);
  background:
    radial-gradient(circle at left top, rgba(197, 83, 49, 0.12), transparent 24%),
    radial-gradient(circle at 88% 14%, rgba(207, 179, 148, 0.24), transparent 18%),
    linear-gradient(180deg, #f7f2ea 0%, #f5efe7 42%, #f2ece3 100%);
  overflow: clip;
}

.landing-root::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(93, 78, 61, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(93, 78, 61, 0.06) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: radial-gradient(circle at center, black 38%, transparent 100%);
  opacity: 0.45;
}

.skip-link {
  position: absolute;
  left: 24px;
  top: 14px;
  z-index: 20;
  padding: 10px 14px;
  border-radius: 999px;
  background: #231d18;
  color: #fff;
  transform: translateY(-140%);
  transition: transform var(--duration-fast) var(--ease-breath);
}

.skip-link:focus-visible {
  transform: translateY(0);
}

.nav {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 18px 24px 0;
}

.nav-shell,
.hero-shell,
.section-shell,
.closing-section {
  width: min(1180px, calc(100% - 48px));
  margin: 0 auto;
}

.nav-shell {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
  padding: 14px 18px;
  border: 1px solid rgba(35, 29, 24, 0.08);
  border-radius: 24px;
  background: rgba(251, 248, 243, 0.74);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 40px rgba(35, 29, 24, 0.06);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: linear-gradient(135deg, #c84d33, #8f2f22);
  color: #fff;
  font-family: var(--font-serif);
  font-size: 18px;
  box-shadow: 0 18px 30px rgba(161, 55, 34, 0.22);
}

.brand-copy {
  display: grid;
  gap: 2px;
}

.brand-copy strong {
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 500;
}

.brand-copy small,
.nav-links a,
.section-label,
.eyebrow {
  color: var(--color-neutral-7);
  font-size: var(--text-label-12);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.nav-links,
.nav-actions,
.hero-actions,
.moments-actions,
.closing-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-links {
  justify-self: center;
}

.nav-link,
.nav-cta,
.primary-btn,
.secondary-btn,
.nav-links a {
  border-radius: 999px;
  transition:
    transform var(--duration-normal) var(--ease-breath),
    background var(--duration-normal) var(--ease-breath),
    color var(--duration-normal) var(--ease-breath),
    box-shadow var(--duration-normal) var(--ease-breath);
}

.nav-links a,
.nav-link {
  padding: 10px 14px;
  color: var(--color-neutral-8);
}

.nav-links a:hover,
.nav-link:hover,
.secondary-btn:hover {
  background: rgba(35, 29, 24, 0.06);
  color: var(--color-neutral-10);
}

.nav-cta,
.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 22px;
  background: linear-gradient(135deg, #c84d33, #8f2f22);
  color: #fff;
  box-shadow: 0 20px 34px rgba(161, 55, 34, 0.22);
}

.nav-cta:hover,
.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 24px 40px rgba(161, 55, 34, 0.28);
}

.secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 20px;
  border: 1px solid rgba(35, 29, 24, 0.08);
  background: rgba(255, 255, 255, 0.52);
  color: var(--color-neutral-9);
}

.hero {
  padding: 72px 0 44px;
}

.hero-shell,
.moments-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.94fr);
  gap: 38px;
  align-items: center;
}

.hero-copy {
  max-width: 640px;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.eyebrow-line {
  width: 44px;
  height: 1px;
  background: rgba(35, 29, 24, 0.18);
}

.hero h1,
.section-head h2,
.moments-copy h2,
.closing-shell h2 {
  margin-bottom: 18px;
  font-size: clamp(3.2rem, 6vw, 5.6rem);
  line-height: 0.95;
  letter-spacing: -0.05em;
  text-wrap: balance;
}

.hero-lead,
.glance-card p,
.moment-item p,
.closing-shell p {
  color: var(--color-neutral-7);
  font-size: var(--text-copy-16);
  line-height: 1.82;
}

.hero-actions {
  margin: 30px 0 34px;
  flex-wrap: wrap;
}

.hero-notes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.hero-notes div,
.glance-card,
.floating-card,
.moments-preview,
.moment-item,
.closing-shell {
  border: 1px solid rgba(35, 29, 24, 0.08);
  background: rgba(251, 248, 243, 0.78);
  box-shadow: 0 18px 42px rgba(35, 29, 24, 0.05);
  backdrop-filter: blur(16px);
}

.hero-notes div {
  padding: 18px;
  border-radius: 22px;
}

.hero-notes strong,
.glance-card h3,
.moment-item strong {
  display: block;
  margin-bottom: 8px;
  color: var(--color-neutral-10);
}

.hero-notes span {
  color: var(--color-neutral-7);
  line-height: 1.7;
}

.hero-stage {
  position: relative;
  min-height: 620px;
}

.floating-card {
  position: absolute;
  overflow: hidden;
  border-radius: 30px;
}

.floating-card--quote {
  left: 0;
  top: 34px;
  width: 240px;
  padding: 22px;
  background: rgba(32, 27, 23, 0.94);
  color: #fff;
}

.floating-card--quote p {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--text-title-24);
  line-height: 1.45;
}

.floating-card--preview {
  inset: 82px 0 86px 64px;
  padding: 18px;
  transform: rotate(-3deg);
}

.floating-card--preview img,
.moments-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 22px;
}

.floating-card--poem {
  right: 8px;
  bottom: 0;
  display: grid;
  gap: 6px;
  width: 250px;
  padding: 20px 22px;
  background: rgba(243, 231, 216, 0.96);
  color: var(--color-neutral-9);
  font-family: var(--font-serif);
  line-height: 1.7;
}

.glance-section,
.moments-section {
  padding: 64px 0;
}

.section-head {
  max-width: 820px;
  margin-bottom: 28px;
}

.section-head h2,
.moments-copy h2,
.closing-shell h2 {
  font-size: clamp(2.2rem, 4vw, 3.8rem);
}

.glance-grid {
  display: grid;
  grid-template-columns: 1.08fr 0.92fr 0.92fr;
  gap: 18px;
}

.glance-card {
  padding: 24px;
  border-radius: 28px;
}

.glance-card--large {
  min-height: 280px;
}

.glance-card--warm {
  background: linear-gradient(180deg, rgba(200, 77, 51, 0.1), rgba(251, 248, 243, 0.86));
}

.glance-index {
  margin-bottom: 24px;
  color: #b4442f;
  font-family: var(--font-mono);
  font-size: var(--text-label-12);
  letter-spacing: 0.18em;
}

.moments-preview {
  padding: 18px;
  border-radius: 34px;
}

.moments-copy {
  max-width: 560px;
}

.moment-list {
  display: grid;
  gap: 14px;
  margin-top: 24px;
}

.moment-item {
  padding: 18px 20px;
  border-radius: 24px;
}

.moment-item strong {
  font-size: var(--text-copy-16);
  line-height: 1.6;
}

.moment-item p {
  margin: 0;
}

.moments-actions {
  margin-top: 28px;
  flex-wrap: wrap;
}

.closing-section {
  padding: 10px 0 96px;
}

.closing-shell {
  padding: 34px;
  border-radius: 34px;
  text-align: center;
  background:
    radial-gradient(circle at top right, rgba(200, 77, 51, 0.14), transparent 28%),
    rgba(251, 248, 243, 0.86);
}

.closing-shell p {
  max-width: 620px;
  margin: 0 auto;
}

.closing-actions {
  justify-content: center;
  margin-top: 28px;
  flex-wrap: wrap;
}

.rv {
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity 0.8s var(--ease-breath),
    transform 0.8s var(--ease-breath);
}

.rv.on {
  opacity: 1;
  transform: translateY(0);
}

.rv-d1 { transition-delay: 80ms; }
.rv-d2 { transition-delay: 160ms; }
.rv-d3 { transition-delay: 240ms; }
.rv-d4 { transition-delay: 320ms; }

@media (max-width: 1080px) {
  .nav-shell {
    grid-template-columns: 1fr auto;
  }

  .nav-links {
    display: none;
  }

  .hero-shell,
  .moments-shell,
  .glance-grid {
    grid-template-columns: 1fr;
  }

  .hero-stage {
    min-height: 520px;
  }
}

@media (max-width: 760px) {
  .nav {
    padding-inline: 12px;
  }

  .nav-shell,
  .hero-shell,
  .section-shell,
  .closing-section {
    width: min(100% - 24px, 1180px);
  }

  .nav-shell {
    grid-template-columns: 1fr;
  }

  .nav-actions {
    justify-content: space-between;
  }

  .hero {
    padding-top: 44px;
  }

  .hero h1 {
    font-size: clamp(2.7rem, 17vw, 4.5rem);
  }

  .hero-notes {
    grid-template-columns: 1fr;
  }

  .hero-stage {
    min-height: 410px;
  }

  .floating-card--quote {
    position: relative;
    top: auto;
    left: auto;
    width: min(100%, 260px);
    margin-bottom: 12px;
  }

  .floating-card--preview {
    inset: 96px 0 52px 0;
    transform: none;
  }

  .floating-card--poem {
    width: 210px;
  }

  .glance-card,
  .moments-preview,
  .moment-item,
  .closing-shell {
    border-radius: 24px;
  }
}
</style>
