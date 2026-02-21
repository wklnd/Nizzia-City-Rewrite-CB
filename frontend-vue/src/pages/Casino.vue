<template>
  <section class="casino">
    <h2>Casino</h2>

    <div class="card">
      <h3>Spin the Wheel</h3>
      <div class="wheel-grid">
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
import api from '../api/client'
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'
import { fmt } from '../utils/format'

const { store, ensurePlayer, reloadPlayer } = usePlayer()
const toast = useToast()
const wheels = ref([])
const busy = ref(false)
const last = ref(null)
const cooldownMsg = ref('')
const isPrivileged = computed(() => (store.player?.playerRole === 'Admin' || store.player?.playerRole === 'Developer'))

function rewardText(r) {
  if (!r) return ''
  if (r.type === 'money' || r.type === 'points' || r.type === 'tokens') return String(r.value)
  if (r.type === 'item') return `Item ${r.value}`
  if (r.type === 'property') return `Property ${r.value}`
  if (r.type === 'special') return r.value
  if (r.type === 'honor' || r.type === 'effect') return r.value
  return JSON.stringify(r)
}

async function loadWheels() {
  try {
    const { data } = await api.get('/casino/wheels')
    wheels.value = data?.wheels || []
  } catch {
    wheels.value = [
      { id: 'wheelLame', name: 'Wheel of Lame', cost: 1000 },
      { id: 'wheelMediocre', name: 'Wheel of Mediocre', cost: 100000 },
      { id: 'wheelAwesome', name: 'Wheel of Awesome', cost: 500000 },
    ]
  }
}

function insufficient(w) { return Number(store.player?.money || 0) < Number(w?.cost || 0) }

async function spin(wheel) {
  if (!store.player?.user) return
  const w = wheels.value.find(x => x.id === wheel)
  if (w && insufficient(w)) { toast.warn('Not enough money'); return }
  busy.value = true; cooldownMsg.value = ''
  try {
    const { data } = await api.post('/casino/spin', { wheel })
    last.value = { wheel, ...data }
    store.mergePartial({ money: data.remainingMoney, points: data.points })
  } catch (e) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to spin'
    last.value = { wheel, error: msg }
    if (/Daily limit/.test(msg)) cooldownMsg.value = msg
  } finally { busy.value = false }
}

onMounted(async () => { await ensurePlayer(); await loadWheels() })
</script>

<style scoped>
.casino { max-width: 800px; margin: 0 auto; }
.wheel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
.wheel { border: 1px dashed var(--border); border-radius: 2px; padding: 10px; display: flex; flex-direction: column; gap: 6px; }
.wheel__name { font-weight: 600; font-size: 13px; }
.wheel__cost { color: var(--muted); font-size: 11px; }
.wheel__hint { color: var(--warn); font-size: 11px; }
.result { font-size: 13px; color: var(--text); }
</style>
