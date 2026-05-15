import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './style.css'
import './themes.css'

const app = createApp(App)

app.config.errorHandler = (err, _instance, info) => {
  console.error('[全局错误]', err, info)
}

app.use(router).mount('#app')
