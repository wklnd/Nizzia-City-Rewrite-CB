import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/style.css'
import './assets/layout.css'

// ── Theme: apply stored preference (default = dark) ──
;(function initTheme() {
  const stored = localStorage.getItem('nc_theme')
  const theme = stored === 'light' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme)
})()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
