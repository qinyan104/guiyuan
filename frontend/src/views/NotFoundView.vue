<template>
  <div class="not-found">
    <main class="not-found__shell">
      <p class="not-found__eyebrow">404</p>
      <h1>这页没有找到。</h1>
      <p class="not-found__copy">
        链接可能已经变更，或者这条路径本来就不属于归源。
        你可以回到首页重新进入，也可以直接去登录页继续工作。
      </p>
      <div class="not-found__actions">
        <router-link to="/" class="not-found__button not-found__button--primary">返回首页</router-link>
        <router-link to="/login" class="not-found__button">前往登录</router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
.not-found {
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: 20px;
  background:
    radial-gradient(circle at top left, rgba(196, 58, 49, 0.12), transparent 24%),
    linear-gradient(180deg, #fbfaf7 0%, #f1ede6 100%);
}

.not-found__shell {
  width: min(620px, 100%);
  padding: 34px;
  border-radius: 30px;
  border: 1px solid rgba(20, 19, 18, 0.08);
  background: rgba(249, 248, 245, 0.88);
  box-shadow: 0 24px 48px rgba(20, 19, 18, 0.08);
  text-align: left;
}

.not-found__eyebrow {
  margin-bottom: 18px;
  color: var(--color-accent);
  font-family: var(--font-mono);
  letter-spacing: 0.16em;
}

.not-found__shell h1 {
  margin-bottom: 14px;
  font-size: clamp(2.5rem, 8vw, 4.4rem);
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.not-found__copy {
  max-width: 38ch;
  color: var(--color-neutral-7);
  line-height: 1.8;
}

.not-found__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.not-found__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(20, 19, 18, 0.08);
  background: rgba(255, 255, 255, 0.56);
  color: var(--color-neutral-8);
}

.not-found__button--primary {
  border-color: transparent;
  background: linear-gradient(145deg, #d15e56, var(--color-accent));
  color: #fff;
}

@media (max-width: 640px) {
  .not-found__shell {
    padding: 24px 18px;
    border-radius: 22px;
  }

  .not-found__actions > * {
    flex: 1 1 100%;
  }
}
</style>
