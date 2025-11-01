<template>
  <div class="topbar">
    <div class="brand">Nizzia City</div>
    <div class="spacer"></div>
    <div class="buttons">
      <!-- Wiki button -->
      <button @click="openWiki" title="Wiki">Wiki</button>
      <button @click="rules" title="Rules">Rules</button>
      <button @click="forums" title="Forums">Forums</button>
      <button @click="discord" title="Discord">Discord</button>
      <button @click="staff" title="Staff">Staff</button>
      <button @click="credits" title="Credits">Credits</button>
    </div>
    <div class="topbar-center">
      <div class="ticker" :class="{ 'ticker--single': tickerMode==='single' }">
        <div class="ticker__track" :style="trackStyle">{{ tickerText }}</div>
      </div>
    </div>
    <div class="spacer"></div>
    <div class="actions">
      <button @click="goProfile" title="Profile">Profile</button>
      <button @click="logout" title="Log out">Log out</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../stores/player'
// Note: do not import dev-only packages (like eslint configs) into runtime code

const router = useRouter()
const store = usePlayerStore()
const hp = ref(0)

// Ticker: simple rotation by default, with optional slow scroll
const tickerMode = ref('scroll') // 'single' | 'scroll'
const newsItems = ref([
  'Welcome to Nizzia City!',
  'Train in the gym to boost your stats.',
  'Happiness increases gym gains.',
  'Jobs pay out daily at 01:00 server time.',
  'Oscar is awesome!',
  'Lazy? Go and train!'
])
const idx = ref(0)
const tickerText = computed(() => tickerMode.value==='single' ? (newsItems.value[idx.value] || '') : newsItems.value.concat(newsItems.value).join(' — '))
const trackStyle = computed(() => tickerMode.value==='scroll' ? { animationDuration: '60s' } : { animation: 'none', paddingLeft: '0' })

let timer
onMounted(() => {
  // Load HP from cached player if present
  try {
    const p = JSON.parse(localStorage.getItem('nc_player')||'null')
    hp.value = typeof p?.health === 'number' ? p.health : 0
  } catch {}
  // Rotate ticker in single mode
  timer = setInterval(() => { if (tickerMode.value==='single') idx.value = (idx.value + 1) % newsItems.value.length }, 8000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })

async function goProfile(){
  // Try store -> localStorage player -> fetch by user to resolve numeric Player.id
  const hasId = (v) => v !== undefined && v !== null
  let pid = store.player?.id
  if (!hasId(pid)) {
    try {
      const cached = JSON.parse(localStorage.getItem('nc_player') || 'null')
      pid = cached?.id
    } catch {}
  }
  if (!hasId(pid)) {
    try {
      const u = JSON.parse(localStorage.getItem('nc_user') || 'null')
      const uid = u?._id ?? u?.id
      if (uid) {
        const p = await store.loadByUser(uid)
        pid = p?.id
      }
    } catch {}
  }
  if (hasId(pid)) router.push(`/profile/${pid}`)
  else router.push('/profile')
}
function logout(){
  try { localStorage.removeItem('nc_token'); localStorage.removeItem('nc_user'); localStorage.removeItem('nc_player'); } catch {}
  router.push('/auth/login')
}

// Topbar action handlers (customize targets as you like)
function openWiki(){
  try { window.open('https://github.com/wklnd/Nizzia-City-Rewrite/wiki', '_blank') } catch {}
}
function rules(){
  // Route to News page as a placeholder for rules; replace with /rules when available
  router.push('/rules')
}
function forums(){
  try { window.open('https://forums.example.com', '_blank') } catch {}
}
function discord(){
  try { window.open('https://discord.gg/your-invite', '_blank') } catch {}
}
function staff(){
  // Placeholder; route somewhere relevant when a staff page exists
  router.push('/hall-of-fame')
}
function credits(){
  router.push('/credits')
}
</script>

<style scoped>
</style>
