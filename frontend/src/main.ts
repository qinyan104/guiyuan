import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import AppSelect from './components/AppSelect.vue'

/* ═══════════════════════════════════════════════════════════════════
   设计系统 — 加载顺序很重要
   1. design-tokens.css   新 Token 体系（Yohaku 色板）
   2. style.css            旧全局 class 定义（组件仍然依赖）
   3. compat.css           旧变量名 → 新 Token 桥接（覆盖旧变量值）
   4. global-base.css      新全局重置 + 工具类
   ═══════════════════════════════════════════════════════════════════ */
import './styles/tokens/design-tokens.css'
import './style.css'
import './styles/tokens/compat.css'
import './styles/global-base.css'

// themes.css 已弃用 — 主题系统由 design-tokens.css 的 [data-theme="dark"] 替代

const app = createApp(App)

app.component('AppSelect', AppSelect)

app.config.errorHandler = (err, _instance, info) => {
  console.error('[全局错误]', err, info)
}

app.use(router).mount('#app')
