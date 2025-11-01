<template>
  <section class="casino">
    <h2>Casino</h2>

    <div class="card">
      <h3>Spin the Wheel</h3>
      <div class="row">
        <div v-for="w in wheels" :key="w.id" class="wheel">
          <div class="wheel__name">{{ w.name }}</div>
          <div class="wheel__cost">Cost: ${{ fmt(w.cost) }}</div>
          <div class="wheel__hint" v-if="insufficient(w)">Need ${{ fmt(w.cost) }}</div>
          <button :disabled="busy || !store.player?.user || (cooldownMsg && !isPrivileged) || insufficient(w)" @click="spin(w.id)">Spin</button>
        </div>
      </div>
      <div class="muted" v-if="cooldownMsg && !isPrivileged">{{ cooldownMsg }}</div>
    </div>

    <div class="card" v-if="last">
      <h3>Result</h3>
      <div class="result">
        <div v-if="last.error" class="error">{{ last.error }}</div>
        <template v-else>
          <div>Wheel: {{ last.wheel }}</div>
          <div>Reward: <strong>{{ last.reward?.type }}</strong> — {{ rewardText(last.reward) }}</div>
          <div>Money: ${{ fmt(last.remainingMoney) }} · Points: {{ last.points || 0 }}</div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player'
import api from '../api/client'

const store = usePlayerStore()
const wheels = ref([])
const busy = ref(false)
const last = ref(null)
const cooldownMsg = ref('')
const isPrivileged = computed(() => (store.player?.playerRole === 'Admin' || store.player?.playerRole === 'Developer'))

function fmt(n){ return Number(n||0).toLocaleString() }
function rewardText(r){
  if (!r) return ''
  if (r.type === 'money' || r.type === 'points' || r.type === 'tokens') return String(r.value)
  if (r.type === 'item') return `Item ${r.value}`
  if (r.type === 'property') return `Property ${r.value}`
  if (r.type === 'special') return r.value
  if (r.type === 'honor' || r.type === 'effect') return r.value
  return JSON.stringify(r)
}

async function loadWheels(){
  try {
    const { data } = await api.get('/casino/wheels')
    wheels.value = data?.wheels || []
  } catch {
    // Fallback to hardcoded
    wheels.value = [
      { id: 'wheelLame', name: 'Wheel of Lame', cost: 1000 },
      { id: 'wheelMediocre', name: 'Wheel of Mediocre', cost: 100000 },
      { id: 'wheelAwesome', name: 'Wheel of Awesome', cost: 500000 },
    ]
  }
}

function insufficient(w){
  const cost = Number(w?.cost || 0)
  const money = Number(store.player?.money || 0)
  return money < cost
}

async function ensurePlayer(){
  if (store.player?.user) return
  try {
    const cached = JSON.parse(localStorage.getItem('nc_player')||'null')
    if (cached?.user) { store.setPlayer(cached); return }
  } catch {}
  try {
    const u = JSON.parse(localStorage.getItem('nc_user')||'null')
    const uid = u?._id ?? u?.id
    if (uid) await store.loadByUser(uid)
  } catch {}
}

async function spin(wheel){
  if (!store.player?.user) {
    alert('Please log in');
    return;
  }
  // Optional pre-check to give a friendlier error before request
  const w = wheels.value.find(x => x.id === wheel)
  if (w && insufficient(w)) { alert('Not enough money to spin this wheel.'); return }
  busy.value = true
  cooldownMsg.value = ''
  try {
    const { data } = await api.post('/casino/spin', { userId: store.player.user, wheel })
    last.value = { wheel, ...data }
    await store.loadByUser(store.player.user) // refresh money/points
  } catch (e) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to spin'
    last.value = { wheel, error: msg }
    // Capture a typical cooldown message
    if (/Daily limit/.test(msg)) cooldownMsg.value = msg
  } finally { busy.value = false }
}

onMounted(async () => { await ensurePlayer(); await loadWheels() })
</script>

<style scoped>
.casino { max-width: 900px; margin: 24px auto; padding: 0 16px; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin: 16px 0; color: var(--text); }
.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.wheel { border:1px dashed var(--border); border-radius: 10px; padding: 12px; display:flex; flex-direction:column; gap:6px }
.wheel__name { font-weight: 600; }
.wheel__cost { color: var(--muted); font-size: 12px; }
.wheel__hint { color: #ffbe5f; font-size: 12px; }
.result { font-size: 14px; color: var(--text); }
.muted { color: var(--muted); font-size: 12px; }
.error { color: #ff5f73; }
button { padding: 8px 12px; background: var(--accent); color: #fff; border: 1px solid transparent; border-radius: 8px; cursor: pointer; }
button:disabled { opacity: 0.6; cursor: not-allowed }
</style>
