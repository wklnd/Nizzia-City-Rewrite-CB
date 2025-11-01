<template>
  <aside class="sidebar">
    <div class="status-effects" v-if="effects.length">
      <span
        v-for="(e, i) in effects"
        :key="i"
        class="effect-icon"
        :data-tip="e.title"
        :title="e.title"
        role="img"
        :aria-label="e.title"
      >{{ e.symbol }}</span>
    </div>
    <div class="info">
      <p id="ui-name">Name: {{ store.player?.name || '—' }}</p>
      <p id="ui-money">Money: {{ money }}</p>
      <p id="ui-level">Level: {{ store.player?.level || 1 }}</p>
      <p id="ui-points">Points: {{ store.player?.points || 0 }}</p>
    </div>

    <div class="info">
      <p id="ui-energy-label">Energy: {{ eNow }}/{{ eMax }}</p>
      <div class="progress-bar"><div class="progress-fill energy" :style="{ width: pct(eNow, eMax) + '%' }"></div></div>

      <p id="ui-nerve-label">Nerve: {{ nNow }}/{{ nMax }}</p>
      <div class="progress-bar"><div class="progress-fill nerve" :style="{ width: pct(nNow, nMax) + '%' }"></div></div>

      <p id="ui-happy-label">Happy: {{ hNow }}/{{ hMax }}</p>
      <div class="progress-bar"><div class="progress-fill happy" :style="{ width: pct(hNow, hMax) + '%' }"></div></div>

  <p id="ui-hp-label">HP: {{ hpNow }}/{{ hpMax }}</p>
  <div class="progress-bar"><div class="progress-fill life" :style="{ width: pct(hpNow, hpMax) + '%' }"></div></div>
    </div>

    <ul>
      <li><RouterLink to="/">Home</RouterLink></li>
      <li><RouterLink to="/inventory">Inventory</RouterLink></li>
      <li><RouterLink to="/city">City</RouterLink></li>
      <li><RouterLink to="/job">Job</RouterLink></li>
      <li><RouterLink to="/gym">Gym</RouterLink></li>
      <li><RouterLink to="/casino">Casino</RouterLink></li>
      <li><RouterLink to="/stocks">Stocks</RouterLink></li>
      <li><RouterLink to="/crimes">Crimes</RouterLink></li>
      <li><RouterLink to="/money">Money</RouterLink></li>
      <li><RouterLink to="/property">Property</RouterLink></li>
    </ul>

    <div id="dev-menu" class="info u-mt-16" v-show="isDev">
      <h3>Developer</h3>
      <div class="u-mb-8">
        <label>Add Money</label>
        <div class="u-flex u-gap-6">
          <input v-model.number="devMoney" type="number" />
          <button @click="doDev('add-money', devMoney)" class="btn">Add</button>
        </div>
      </div>
      <div class="u-mb-8">
        <label>Add Energy</label>
        <div class="u-flex u-gap-6">
          <input v-model.number="devEnergy" type="number" />
          <button @click="doDev('add-energy', devEnergy)" class="btn">Add</button>
        </div>
      </div>
      <div>
        <label>Add Nerve</label>
        <div class="u-flex u-gap-6">
          <input v-model.number="devNerve" type="number" />
          <button @click="doDev('add-nerve', devNerve)" class="btn">Add</button>
        </div>
      </div>
      <div class="u-mt-8 msg" :class="{ ok: devMsgOk, err: !devMsgOk }">{{ devMsg }}</div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import api from '../api/client'
import { usePlayerStore } from '../stores/player'

const store = usePlayerStore()
const user = ref(null)
const router = useRouter()

const eNow = computed(() => store.player?.energyStats?.energy ?? 0)
const eMax = computed(() => store.player?.energyStats?.energyMax ?? 0)
const nNow = computed(() => store.player?.nerveStats?.nerve ?? 0)
const nMax = computed(() => store.player?.nerveStats?.nerveMax ?? 0)
const hNow = computed(() => store.player?.happiness?.happy ?? 0)
const hMax = computed(() => store.player?.happiness?.happyMax ?? 0)
const hpNow = computed(() => typeof store.player?.health === 'number' ? store.player.health : 0)
const hpMax = 100
const money = computed(() => fmtMoney(store.player?.money || 0))

const isDev = computed(() => store.player?.playerRole === 'Developer')

const devMoney = ref(100000)
const devEnergy = ref(10)
const devNerve = ref(5)
const devMsg = ref('')
const devMsgOk = ref(true)

function pct(cur, max){ return max > 0 ? Math.min(100, Math.round((cur/max)*100)) : 0 }
function fmtMoney(n){ return `$${Number(n||0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` }

async function load(){
  try { user.value = JSON.parse(localStorage.getItem('nc_user')||'null') } catch {}
  if (!user.value?._id) return
  try {
    await store.loadByUser(user.value._id)
  } catch (e) {
    if (e?.response?.status === 404) {
      router.push('/auth/create-player')
    }
  }
}

// Effects: cooldowns, bank lock, stocks presence, drugs/booster active
const bankUnlockAt = ref(null)
const now = ref(Date.now())
let timerId

function tick(){ now.value = Date.now() }
onMounted(() => { timerId = setInterval(tick, 1000) })
onUnmounted(() => { if (timerId) clearInterval(timerId) })

function formatDuration(sec){
  if (!Number.isFinite(sec) || sec <= 0) return '0s'
  let s = Math.floor(sec)
  const d = Math.floor(s / 86400); s -= d*86400
  const h = Math.floor(s / 3600); s -= h*3600
  const m = Math.floor(s / 60); s -= m*60
  const parts = []
  if (d) parts.push(d + 'd')
  if (h) parts.push(h + 'h')
  if (m) parts.push(m + 'm')
  if (parts.length === 0) parts.push(s + 's')
  return parts.join(' ')
}

const hasStocks = computed(() => {
  const pf = store.player?.portfolio || []
  return pf.some(p => Number(p?.shares||0) > 0)
})

async function loadBank(){
  try {
    if (!user.value?._id) return
    const { data } = await api.get(`/bank/accounts/${user.value._id}`)
    const active = (data?.accounts||[]).filter(a => !a.isWithdrawn && new Date(a.endDate) > new Date())
    if (active.length) {
      // soonest unlock
      active.sort((a,b)=> new Date(a.endDate) - new Date(b.endDate))
      bankUnlockAt.value = new Date(active[0].endDate)
    } else {
      bankUnlockAt.value = null
    }
  } catch {}
}

const effects = computed(() => {
  const arr = []
  const cds = store.player?.cooldowns || {}
  if (Number(cds.medicalCooldown||0) > 0) arr.push({ symbol: '🩹', title: `Medical cooldown • ${formatDuration(cds.medicalCooldown)}` })
  // Drug cooldowns: aggregate across per-drug map or legacy single value
  const drugMap = cds.drugs || {};
  let drugCount = 0; let maxDrug = 0;
  if (drugMap instanceof Map) {
    for (const v of drugMap.values()) { const n=Number(v||0); if (n>0){drugCount++; maxDrug=Math.max(maxDrug,n);} }
  } else {
    for (const k in drugMap) { const n=Number(drugMap[k]||0); if (n>0){drugCount++; maxDrug=Math.max(maxDrug,n);} }
  }
  const legacyDrug = Number(cds.drugCooldown||0);
  if (legacyDrug>0) { drugCount = Math.max(drugCount, 1); maxDrug = Math.max(maxDrug, legacyDrug); }
  if (drugCount>0) arr.push({ symbol: '💊', title: `Drug cooldowns • ${drugCount} active • longest ${formatDuration(maxDrug)}` })
  // Alcohol cooldown
  if (Number(cds.alcoholCooldown||0) > 0) arr.push({ symbol: '🍺', title: `Alcohol cooldown • ${formatDuration(cds.alcoholCooldown)}` })
  if (Number(cds.boosterCooldown||0) > 0) arr.push({ symbol: '⚡', title: `Booster active • ${formatDuration(cds.boosterCooldown)}` })
  if (hasStocks.value) arr.push({ symbol: '📈', title: 'Stock holdings present' })
  if (bankUnlockAt.value) {
    const remainSec = Math.max(0, Math.floor((bankUnlockAt.value.getTime() - now.value)/1000))
    arr.push({ symbol: '🏦', title: `Bank unlocks in • ${formatDuration(remainSec)}` })
  }
  return arr
})

onMounted(async () => {
  await load()
  await loadBank()
})

async function doDev(path, amount){
  devMsg.value = ''
  try {
    await api.post(`/dev/${path}`, { userId: user.value?._id, amount: Number(amount) })
    await load()
    devMsgOk.value = true
    devMsg.value = 'Done.'
  } catch (e) {
    devMsgOk.value = false
    devMsg.value = e?.response?.data?.message || e?.message || 'Error'
  }
}

onMounted(load)
</script>

<style scoped>
/* Styling comes from global layout.css */
.status-effects { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; overflow: visible; }
.effect-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px; height: 26px;
  border-radius: 999px;
  border: 1px solid var(--border, #2b2f38);
  background: rgba(255,255,255,0.04);
  font-size: 14px;
  cursor: default;
}
.effect-icon::after {
  content: attr(data-tip);
  position: absolute;
  left: 0;
  right: auto;
  top: calc(100% + 8px);
  bottom: auto;
  transform: none;
  display: inline-block;
  text-align: left;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: normal;
  min-width: 140px;
  max-width: min(260px, 80vw);
  background: var(--panel, #171a2b);
  color: var(--text, #e8eaf6);
  border: 1px solid var(--border, rgba(255,255,255,0.12));
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1;
  box-shadow: 0 6px 16px rgba(0,0,0,0.3);
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
  z-index: 1000;
}
.effect-icon:hover::after { opacity: 1; }
</style>
