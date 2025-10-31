<template>
  <div class="topbar">
    <div class="brand">Nizzia City</div>
    <div class="spacer"></div>
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

const router = useRouter()
const hp = ref(0)

// Ticker: simple rotation by default, with optional slow scroll
const tickerMode = ref('single') // 'single' | 'scroll'
const newsItems = ref([
  'Welcome to Nizzia City!',
  'Train in the gym to boost your stats.',
  'Happiness increases gym gains.',
  'Jobs pay out daily at 01:00 server time.',
  'Oscar is awesome!',
  'Milf? Go and train!'
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

function goProfile(){
  alert('Profile panel coming soon')
}
function logout(){
  try { localStorage.removeItem('nc_token'); localStorage.removeItem('nc_user'); localStorage.removeItem('nc_player'); } catch {}
  router.push('/auth/login')
}
</script>

<style scoped>
/* Styling comes from global layout.css */
</style>
