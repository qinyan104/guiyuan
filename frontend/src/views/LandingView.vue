<template>
  <div class="landing-root">
    <nav class="site-nav" aria-label="主导航">
      <div class="site-nav__inner">
        <router-link to="/" class="brand" aria-label="归源首页">
          <span class="brand__mark" aria-hidden="true">归</span>
          <span class="brand__name">归源</span>
        </router-link>
        <router-link to="/dashboard" class="site-nav__action">已有家谱？进入系统</router-link>
      </div>
    </nav>

    <main>
      <section class="hero">
        <div class="hero__copy">
          <p class="hero__overline">归源 · 家族数字档案</p>
          <h1>从一个名字开始<br />把家族留在当下</h1>
          <p class="hero__lead">
            把散落在聊天、相册和记忆里的家人故事，整理成一份可以一起维护、持续传下去的家族档案。
          </p>
          <div class="hero__actions">
            <router-link to="/dashboard" class="button button--primary" data-testid="landing-primary-action">
              开始整理家谱
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </router-link>
            <a class="button button--quiet" href="#how-it-works">看看它怎么工作</a>
          </div>
          <p class="hero__note">从第一位家人开始，其他脉络会自然长出来。</p>
        </div>

        <div class="family-atlas" aria-label="家族关系从过去延伸到当下的示意图">
          <div class="family-atlas__topline">
            <span>一份不断生长的家谱</span>
            <span class="family-atlas__signal"><i></i> 正在整理</span>
          </div>
          <div class="family-atlas__canvas" aria-hidden="true">
            <span class="atlas-thread atlas-thread--one"></span>
            <span class="atlas-thread atlas-thread--two"></span>
            <span class="atlas-thread atlas-thread--three"></span>
            <span class="atlas-thread atlas-thread--four"></span>
            <div class="atlas-node atlas-node--elder">
              <span class="atlas-node__dot"></span>
              <span>祖辈</span>
            </div>
            <div class="atlas-node atlas-node--parent">
              <span class="atlas-node__dot"></span>
              <span>父母</span>
            </div>
            <div class="atlas-node atlas-node--branch">
              <span class="atlas-node__dot"></span>
              <span>家人</span>
            </div>
            <div class="atlas-node atlas-node--today">
              <span class="atlas-node__dot"></span>
              <span>今天</span>
            </div>
          </div>
          <div class="family-atlas__caption">
            <strong>名字相连，故事才有了来处。</strong>
            <span>在同一张谱里，慢慢补全每一段记忆。</span>
          </div>
        </div>
      </section>

      <section id="how-it-works" class="journey">
        <div class="journey__intro">
          <h2>不是把资料存起来，<br />而是让家人重新相见。</h2>
          <p>归源把复杂的谱系整理成可以从容开始的日常动作。</p>
        </div>
        <ol class="journey__steps">
          <li>
            <span class="journey__line" aria-hidden="true"></span>
            <div>
              <h3>把第一个人放上画布</h3>
              <p>从你最熟悉的名字开始，关系和分支随时可以慢慢补全。</p>
            </div>
          </li>
          <li>
            <span class="journey__line" aria-hidden="true"></span>
            <div>
              <h3>邀请家人一起补完</h3>
              <p>让了解往事的人参与进来，把各自记得的片段拼成同一份档案。</p>
            </div>
          </li>
          <li>
            <span class="journey__line" aria-hidden="true"></span>
            <div>
              <h3>把故事带到下一代</h3>
              <p>在同一个地方完成整理、协作与出版，让家谱也成为可以分享的作品。</p>
            </div>
          </li>
        </ol>
      </section>

      <section class="canvas-section">
        <div class="canvas-section__heading">
          <div>
            <h2>看清关系，也看见自己从哪里来。</h2>
            <p>无限画布让每一条关系都留在视野里，而不是被困在一张表格中。</p>
          </div>
          <router-link to="/dashboard" class="text-link">进入我的家谱 <span aria-hidden="true">→</span></router-link>
        </div>
        <figure class="canvas-preview">
          <img src="/screenshot.png" alt="归源家谱工作台的关系画布预览" />
          <figcaption>归源工作台 · 关系会随着每一次补充慢慢清晰</figcaption>
        </figure>
      </section>

      <section class="closing">
        <div class="closing__copy">
          <p>一份家谱，值得从今天开始。</p>
          <h2>把你记得的，<br />留给以后的人。</h2>
        </div>
        <router-link to="/dashboard" class="button button--ink">
          创建第一份家谱
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </router-link>
      </section>
    </main>

    <footer class="site-footer">
      <router-link to="/" class="brand" aria-label="归源首页">
        <span class="brand__mark" aria-hidden="true">归</span>
        <span class="brand__name">归源</span>
      </router-link>
      <p>为家人留下可以一起维护的记忆。</p>
      <div class="site-footer__links">
        <router-link to="/privacy">隐私政策</router-link>
        <router-link to="/terms">服务条款</router-link>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing-root {
  min-height: 100vh;
  overflow: hidden;
  color: var(--color-neutral-9);
  background:
    radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--color-accent) 6%, transparent), transparent 28rem),
    linear-gradient(140deg, #fffdf9 0%, var(--color-neutral-1) 52%, #efece4 100%);
}

.site-nav,
.hero,
.journey,
.canvas-section,
.closing,
.site-footer {
  width: min(1180px, calc(100% - 48px));
  margin-inline: auto;
}

.site-nav {
  min-height: 84px;
  display: flex;
  align-items: center;
}

.site-nav__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-neutral-10);
}

.brand:hover,
.site-nav__action:hover,
.text-link:hover,
.site-footer__links a:hover {
  opacity: 1;
}

.brand__mark {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 60%, var(--color-neutral-4));
  border-radius: 9px;
  color: var(--color-accent-deep);
  font-family: var(--font-serif);
  font-size: 17px;
  line-height: 1;
}

.brand__name {
  font-family: var(--font-serif);
  font-size: var(--text-copy-16);
  font-weight: 500;
  letter-spacing: 0.14em;
}

.site-nav__action {
  padding: 8px 0;
  color: var(--color-neutral-7);
  font-size: var(--text-copy-13);
  font-weight: 500;
  border-bottom: 1px solid transparent;
  transition: border-color var(--duration-fast) var(--ease-breath), color var(--duration-fast) var(--ease-breath);
}

.site-nav__action:hover {
  color: var(--color-neutral-10);
  border-color: var(--color-accent);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(440px, 0.9fr);
  align-items: center;
  gap: clamp(48px, 9vw, 128px);
  min-height: calc(100vh - 84px);
  padding: 64px 0 104px;
}

.hero__copy {
  max-width: 590px;
}

.hero__overline,
.family-atlas__topline,
.hero__note,
.canvas-preview figcaption,
.site-footer,
.site-footer__links {
  font-size: var(--text-label-12);
  line-height: var(--leading-label);
}

.hero__overline {
  margin-bottom: 22px;
  color: var(--color-accent-deep);
  font-weight: 500;
  letter-spacing: 0.09em;
}

.hero h1,
.journey h2,
.canvas-section h2,
.closing h2 {
  color: var(--color-neutral-10);
  font-family: var(--font-serif);
  font-weight: 500;
  letter-spacing: -0.02em;
}

.hero h1 {
  max-width: 11ch;
  margin-bottom: 26px;
  font-size: clamp(42px, 5vw, 72px);
  line-height: 1.13;
  text-wrap: balance;
}

.hero__lead {
  max-width: 35ch;
  margin-bottom: 32px;
  color: var(--color-neutral-7);
  font-size: clamp(var(--text-copy-16), 1.5vw, 19px);
  line-height: 1.8;
}

.hero__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px 20px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 48px;
  padding: 0 20px;
  border-radius: var(--radius-md);
  font-size: var(--text-copy-14);
  font-weight: 500;
  transition: transform var(--duration-fast) var(--ease-spring-gentle), background-color var(--duration-fast) var(--ease-breath), box-shadow var(--duration-fast) var(--ease-breath);
}

.button svg {
  width: 18px;
  height: 18px;
  transition: transform var(--duration-fast) var(--ease-spring-gentle);
}

.button:hover {
  opacity: 1;
  transform: translateY(-2px);
}

.button:hover svg {
  transform: translateX(3px);
}

.button--primary {
  color: var(--color-text-on-accent);
  background: var(--color-accent-gradient);
  box-shadow: var(--shadow-accent);
}

.button--primary:hover {
  box-shadow: 0 16px 36px color-mix(in srgb, var(--color-accent) 25%, transparent);
}

.button--quiet {
  min-height: auto;
  padding: 8px 0;
  color: var(--color-neutral-8);
  border-bottom: 1px solid var(--color-neutral-5);
  border-radius: 0;
}

.button--quiet:hover {
  color: var(--color-neutral-10);
  border-color: var(--color-neutral-8);
}

.button--ink {
  color: var(--color-neutral-1);
  background: var(--color-neutral-10);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-neutral-10) 16%, transparent);
}

.hero__note {
  margin-top: 24px;
  color: var(--color-neutral-6);
}

.family-atlas {
  align-self: center;
  overflow: hidden;
  border-radius: var(--radius-2xl);
  color: #f9f5ec;
  background: #171512;
  box-shadow: 0 28px 60px rgba(28, 26, 23, 0.16);
}

.family-atlas__topline,
.family-atlas__caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  color: rgba(249, 245, 236, 0.66);
}

.family-atlas__topline {
  border-bottom: 1px solid rgba(249, 245, 236, 0.1);
}

.family-atlas__signal {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}

.family-atlas__signal i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #6db58a;
  box-shadow: 0 0 0 4px rgba(109, 181, 138, 0.12);
}

.family-atlas__canvas {
  position: relative;
  min-height: 336px;
  margin: 0 24px;
  overflow: hidden;
}

.family-atlas__canvas::before {
  content: '';
  position: absolute;
  inset: 24px 0;
  background-image: linear-gradient(rgba(249, 245, 236, 0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(249, 245, 236, 0.055) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: linear-gradient(to bottom, transparent, black 14%, black 86%, transparent);
}

.atlas-thread {
  position: absolute;
  height: 1px;
  background: linear-gradient(90deg, rgba(249, 245, 236, 0.08), rgba(198, 60, 46, 0.9), rgba(249, 245, 236, 0.16));
  transform-origin: left;
  animation: thread-breathe 5.5s var(--ease-breath) infinite alternate;
}

.atlas-thread--one { top: 31%; left: 17%; width: 39%; transform: rotate(26deg); }
.atlas-thread--two { top: 51%; left: 40%; width: 30%; transform: rotate(-36deg); animation-delay: -2s; }
.atlas-thread--three { top: 56%; left: 13%; width: 30%; transform: rotate(-12deg); animation-delay: -3.8s; }
.atlas-thread--four { top: 73%; left: 44%; width: 39%; transform: rotate(8deg); animation-delay: -1.2s; }

.atlas-node {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  border: 1px solid rgba(249, 245, 236, 0.15);
  border-radius: var(--radius-md);
  color: rgba(249, 245, 236, 0.92);
  background: rgba(249, 245, 236, 0.06);
  font-size: var(--text-label-12);
  backdrop-filter: blur(10px);
}

.atlas-node__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(249, 245, 236, 0.76);
}

.atlas-node--elder { top: 18%; left: 7%; }
.atlas-node--parent { top: 46%; left: 47%; }
.atlas-node--branch { top: 58%; left: 8%; }
.atlas-node--today { right: 7%; bottom: 17%; border-color: rgba(213, 85, 69, 0.58); background: rgba(198, 60, 46, 0.16); }
.atlas-node--today .atlas-node__dot { background: #d95545; box-shadow: 0 0 0 5px rgba(217, 85, 69, 0.12); }

.family-atlas__caption {
  flex-direction: column;
  align-items: flex-start;
  border-top: 1px solid rgba(249, 245, 236, 0.1);
}

.family-atlas__caption strong {
  color: #f9f5ec;
  font-family: var(--font-serif);
  font-size: var(--text-copy-16);
  font-weight: 500;
}

@keyframes thread-breathe {
  from { opacity: 0.55; }
  to { opacity: 1; }
}

.journey {
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
  gap: clamp(48px, 8vw, 128px);
  padding: 128px 0;
  border-top: 1px solid var(--color-neutral-4);
}

.journey__intro h2,
.canvas-section h2,
.closing h2 {
  margin-bottom: 20px;
  font-size: clamp(30px, 3.4vw, 48px);
  line-height: 1.24;
  text-wrap: balance;
}

.journey__intro p,
.canvas-section__heading p {
  max-width: 33ch;
  color: var(--color-neutral-7);
  font-size: var(--text-copy-16);
  line-height: 1.8;
}

.journey__steps {
  display: grid;
}

.journey__steps li {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 16px;
  padding: 26px 0;
  border-top: 1px solid var(--color-neutral-4);
}

.journey__steps li:last-child {
  border-bottom: 1px solid var(--color-neutral-4);
}

.journey__line {
  width: 28px;
  height: 1px;
  margin-top: 15px;
  background: var(--color-accent);
}

.journey__steps h3 {
  margin-bottom: 7px;
  color: var(--color-neutral-10);
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 500;
}

.journey__steps p {
  max-width: 42ch;
  color: var(--color-neutral-7);
  font-size: var(--text-copy-14);
  line-height: 1.75;
}

.canvas-section {
  padding: 56px 0 128px;
}

.canvas-section__heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 42px;
}

.canvas-section h2 {
  max-width: 17ch;
}

.text-link {
  flex: 0 0 auto;
  padding-bottom: 5px;
  color: var(--color-neutral-9);
  font-size: var(--text-copy-14);
  font-weight: 500;
  border-bottom: 1px solid var(--color-accent);
}

.text-link span {
  display: inline-block;
  margin-left: 4px;
  color: var(--color-accent);
  transition: transform var(--duration-fast) var(--ease-spring-gentle);
}

.text-link:hover span { transform: translateX(4px); }

.canvas-preview {
  overflow: hidden;
  margin: 0;
  background: var(--color-neutral-2);
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-2xl);
  box-shadow: 0 24px 54px rgba(28, 26, 23, 0.09);
}

.canvas-preview img {
  width: 100%;
  min-height: 320px;
  object-fit: cover;
  object-position: top center;
}

.canvas-preview figcaption {
  padding: 15px 20px;
  color: var(--color-neutral-7);
  border-top: 1px solid var(--color-neutral-4);
}

.closing {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 40px;
  margin-bottom: 72px;
  padding: clamp(48px, 8vw, 100px);
  color: #f9f5ec;
  background: #171512;
  border-radius: var(--radius-2xl);
}

.closing__copy > p {
  margin-bottom: 16px;
  color: rgba(249, 245, 236, 0.62);
  font-size: var(--text-copy-14);
}

.closing h2 {
  margin: 0;
  color: #f9f5ec;
}

.site-footer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 32px;
  padding: 0 0 38px;
  color: var(--color-neutral-7);
  border-top: 1px solid var(--color-neutral-4);
}

.site-footer .brand { margin-top: 24px; }
.site-footer p { margin: 24px 0 0; }
.site-footer__links { display: flex; gap: 18px; margin-top: 24px; }
.site-footer__links a { color: var(--color-neutral-7); }

:global([data-theme='dark'] .landing-root) {
  background:
    radial-gradient(circle at 82% 18%, rgba(217, 85, 69, 0.08), transparent 28rem),
    linear-gradient(140deg, #0c0c0b 0%, #12110f 54%, #1a1815 100%);
}

:global([data-theme='dark'] .family-atlas),
:global([data-theme='dark'] .closing) {
  background: #080807;
}

@media (max-width: 860px) {
  .hero { grid-template-columns: 1fr; padding-top: 48px; }
  .hero__copy { max-width: 680px; }
  .family-atlas { width: min(100%, 620px); }
  .journey { grid-template-columns: 1fr; gap: 40px; }
  .canvas-section__heading { align-items: flex-start; flex-direction: column; }
  .closing { align-items: flex-start; flex-direction: column; }
}

@media (max-width: 640px) {
  .site-nav,
  .hero,
  .journey,
  .canvas-section,
  .closing,
  .site-footer { width: min(100% - 32px, 1180px); }
  .site-nav { min-height: 72px; }
  .site-nav__action { font-size: var(--text-label-12); }
  .hero { min-height: auto; padding: 48px 0 76px; }
  .hero h1 { font-size: clamp(38px, 12vw, 52px); }
  .hero__lead { font-size: var(--text-copy-16); }
  .hero__actions { align-items: flex-start; flex-direction: column; }
  .family-atlas__canvas { min-height: 290px; }
  .family-atlas__topline,
  .family-atlas__caption { padding: 16px 18px; }
  .family-atlas__canvas { margin: 0 18px; }
  .journey { padding: 84px 0; }
  .canvas-section { padding: 28px 0 84px; }
  .canvas-preview img { min-height: 220px; }
  .closing { margin-bottom: 48px; padding: 42px 28px; }
  .site-footer { grid-template-columns: 1fr; gap: 0; padding-bottom: 28px; }
  .site-footer__links { margin-top: 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .atlas-thread { animation: none; }
  .button,
  .button svg,
  .text-link span { transition: none; }
}
</style>
