<template>
  <section class="grow">
    <h2>🌿 Grow Operation</h2>
    <p class="muted">Manage your pots, plant seeds, and harvest your crop. Sell it or smoke it — your call.</p>

    <div class="panel" v-if="loading">Loading…</div>
    <div class="panel" v-else-if="error" style="color:var(--danger);">{{ error }}</div>

    <!-- Gate: no warehouse → redirect to real estate -->
    <div v-else-if="!data.warehouse" class="panel gate-panel">
      <div class="gate-msg">
        <div class="gate-icon">🏭</div>
        <div>
          <strong>You need a warehouse to grow.</strong>
          <p class="muted">Head to Real Estate → Properties to purchase one.</p>
        </div>
      </div>
      <router-link to="/real-estate" class="btn btn--primary">Go to Real Estate</router-link>
    </div>

    <div v-else>
      <!-- ─── Warehouse Status Bar ───────────────────────────── -->
      <div class="panel wh-bar">
        <div class="wh-info">
          <div class="wh-name">{{ whDef?.name || data.warehouse.type }}</div>
          <div class="wh-tags">
            <span class="pill">Pots: {{ data.warehouse.pots }} / {{ data.warehouse.maxPots }}</span>
          </div>
        </div>
        <div class="wh-actions">
          <button class="btn" @click="doBuyPot" :disabled="busy || data.warehouse.pots >= data.warehouse.maxPots">
            Buy Pot (${{ fmtInt(potCost) }})
          </button>
          <router-link to="/real-estate" class="btn">Upgrade Warehouse</router-link>
        </div>
      </div>

      <!-- ─── Pots & Growing Section ────────────────────────── -->
      <div class="panel" style="margin-top:12px;">
        <h3>Your Pots</h3>
        <div v-if="!data.pots?.length" class="muted">No pots yet. Buy some above!</div>
        <div class="pots-grid" v-else>
          <div class="pot" v-for="pot in data.pots" :key="pot.potIndex">
            <div class="pot-header">
              <span class="pot-label">Pot #{{ pot.potIndex + 1 }}</span>
              <span v-if="pot.strainName" class="pill pill-strain">{{ pot.strainName }}</span>
              <span v-else class="muted">Empty</span>
            </div>

            <!-- Empty pot — show plant selector -->
            <div v-if="!pot.strainId" class="pot-empty">
              <select v-model="plantSelections[pot.potIndex]" class="input">
                <option value="">-- Select Strain --</option>
                <option v-for="s in strainCatalog" :key="s.id" :value="s.id">
                  {{ s.name }} ({{ fmtMoney(s.seedCost + dirtCost) }})
                </option>
              </select>
              <button class="btn" @click="doPlant(pot.potIndex)" :disabled="busy || !plantSelections[pot.potIndex]">
                🌱 Plant
              </button>
            </div>

            <!-- Growing pot — show progress -->
            <div v-else class="pot-growing">
              <div class="stage-label">{{ stageName(pot.stage) }}</div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: pot.progress + '%' }"
                     :class="{ 'progress-done': pot.done }"></div>
              </div>
              <div class="pot-timer" v-if="!pot.done">{{ fmtTime(pot.timeLeft) }} remaining</div>
              <button v-if="pot.done" class="btn btn-harvest" @click="doHarvest(pot.potIndex)" :disabled="busy">
                🌾 Harvest
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Seed Catalog ──────────────────────────────────── -->
      <div class="panel" style="margin-top:12px;">
        <h3>Seed Catalog</h3>
        <div class="strain-table">
          <table>
            <thead>
              <tr>
                <th>Strain</th>
                <th>Seed + Dirt</th>
                <th>Grow Time</th>
                <th>Yield</th>
                <th>Sell / g</th>
                <th>Effect</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in strainCatalog" :key="s.id">
                <td><strong>{{ s.name }}</strong><br/><span class="muted td-desc">{{ s.description }}</span></td>
                <td>{{ fmtMoney(s.seedCost + dirtCost) }}</td>
                <td>{{ fmtTime(s.growTime) }}</td>
                <td>{{ s.yield.min }}–{{ s.yield.max }}g</td>
                <td>{{ fmtMoney(s.sellPrice) }}</td>
                <td class="td-effect">
                  <span v-for="(v, k) in effectWithoutDuration(s.effect)" :key="k" class="pill pill-fx">
                    +{{ v }} {{ k }}
                  </span>
                  <span class="muted" v-if="s.effect?.duration">({{ fmtTime(s.effect.duration) }})</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ─── Stash Section ─────────────────────────────────── -->
      <div class="panel" style="margin-top:12px;">
        <h3>Your Stash</h3>
        <div v-if="!data.stash?.length" class="muted">Nothing in your stash. Grow something!</div>
        <div v-else class="stash-grid">
          <div class="stash-item" v-for="s in data.stash" :key="s.strainId">
            <div class="stash-head">
              <strong>{{ s.strainName }}</strong>
              <span class="pill">{{ s.grams }}g</span>
            </div>
            <div class="stash-info">
              <span class="muted">Sell: {{ fmtMoney(s.sellPricePerGram) }}/g</span>
              <span class="muted" v-if="s.effect">
                | Use: <span v-for="(v, k) in effectWithoutDuration(s.effect)" :key="k">+{{ v }} {{ k }} </span>
              </span>
            </div>
            <div class="stash-actions">
              <input v-model.number="stashAmounts[s.strainId]" type="number" min="1" :max="s.grams"
                     class="input input-sm" placeholder="g" />
              <button class="btn btn-sm" @click="doSell(s.strainId, s.grams)" :disabled="busy">
                💰 Sell
              </button>
              <button class="btn btn-sm btn-use" @click="doUse(s.strainId, s.grams)" :disabled="busy">
                🚬 Use
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import api from '../api/client'
import { useToast } from '../composables/useToast'
import { fmtMoney, fmtInt } from '../utils/format'

const toast = useToast()

const loading = ref(true)
const error = ref('')
const busy = ref(false)
const data = ref({ warehouse: null, pots: [], stash: [] })
const strainCatalog = ref([])
const plantSelections = reactive({})
const stashAmounts = reactive({})
const dirtCost = 100
const potCost = 2500
let refreshTimer = null

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec))
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}h ${m}m`
}
function stageName(s) {
  const names = { seedling: '🌱 Seedling', vegetative: '🌿 Vegetative', flowering: '🌸 Flowering', ready: '✅ Ready to Harvest' }
  return names[s] || s || 'Empty'
}
function effectWithoutDuration(fx) {
  if (!fx) return {}
  const out = { ...fx }
  delete out.duration
  return out
}

const whDef = ref(null)

async function load() {
  loading.value = true; error.value = ''
  try {
    const [myRes, strRes, whRes] = await Promise.all([
      api.get('/grow/my'),
      api.get('/grow/strains'),
      api.get('/grow/warehouses'),
    ])
    data.value = myRes.data || myRes
    strainCatalog.value = (strRes.data || strRes).strains || []
    const whCatalog = (whRes.data || whRes).warehouses || []
    whDef.value = data.value.warehouse
      ? whCatalog.find(w => w.id === data.value.warehouse.type) || null
      : null
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to load'
  } finally { loading.value = false }
}

async function refreshPots() {
  try {
    const res = await api.get('/grow/my')
    const d = res.data || res
    data.value.pots = d.pots || []
    data.value.stash = d.stash || []
    if (d.warehouse) data.value.warehouse = d.warehouse
  } catch { /* silent */ }
}

async function doBuyPot() {
  busy.value = true
  try {
    const res = await api.post('/grow/buy-pot')
    toast.ok(`Bought pot #${(res.data?.potIndex ?? 0) + 1}!`)
    await load()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed')
  } finally { busy.value = false }
}

async function doPlant(potIndex) {
  busy.value = true
  try {
    const strainId = plantSelections[potIndex]
    if (!strainId) throw new Error('Select a strain first')
    await api.post('/grow/plant', { potIndex, strainId })
    plantSelections[potIndex] = ''
    toast.ok(`Planted ${strainCatalog.value.find(s => s.id === strainId)?.name || strainId}!`)
    await refreshPots()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed')
  } finally { busy.value = false }
}

async function doHarvest(potIndex) {
  busy.value = true
  try {
    const res = await api.post('/grow/harvest', { potIndex })
    const d = res.data || res
    toast.ok(`Harvested ${d.grams}g of ${d.strainName}!`)
    await refreshPots()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed')
  } finally { busy.value = false }
}

async function doSell(strainId, maxGrams) {
  busy.value = true
  try {
    const grams = stashAmounts[strainId] || maxGrams
    const res = await api.post('/grow/sell', { strainId, grams })
    const d = res.data || res
    toast.ok(`Sold ${d.sold}g for ${fmtMoney(d.earnings)}! (${d.remaining}g left)`)
    stashAmounts[strainId] = undefined
    await refreshPots()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed')
  } finally { busy.value = false }
}

async function doUse(strainId, maxGrams) {
  busy.value = true
  try {
    const grams = stashAmounts[strainId] || 1
    const res = await api.post('/grow/use', { strainId, grams })
    const d = res.data || res
    const fxStr = Object.entries(d.effects || {}).filter(([k]) => k !== 'addiction').map(([k, v]) => `+${v} ${k}`).join(', ')
    toast.ok(`Used ${d.used}g of ${d.strainName}. ${fxStr}`)
    stashAmounts[strainId] = undefined
    await refreshPots()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed')
  } finally { busy.value = false }
}

onMounted(() => {
  load()
  // Auto-refresh pot timers every 15s
  refreshTimer = setInterval(refreshPots, 15000)
})
onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.gate-panel { display: flex; flex-direction: column; gap: 14px; align-items: flex-start; padding: 20px; margin-top: 10px; }
.gate-msg { display: flex; gap: 14px; align-items: center; }
.gate-icon { font-size: 36px; }
.gate-msg p { margin-top: 3px; font-size: 12px; color: var(--muted); }
.wh-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-wrap: wrap; gap: 10px; }
.wh-info { display: flex; align-items: center; gap: 10px; }
.wh-name { font-size: 14px; font-weight: 700; }
.wh-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.wh-actions { display: flex; gap: 6px; align-items: center; }
.pill-strain { border-color: var(--accent); color: var(--accent); }
.pill-fx { border-color: var(--accent); color: var(--muted); }
.pots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px; }
.pot { border: 1px solid var(--border); border-radius: 2px; padding: 10px; background: var(--panel); }
.pot-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.pot-label { font-weight: 700; font-size: 12px; }
.pot-empty { display: flex; gap: 6px; align-items: center; }
.pot-growing { display: flex; flex-direction: column; gap: 4px; }
.stage-label { font-size: 12px; }
.progress-bar { width: 100%; height: 10px; background: var(--bar-track); border-radius: 2px; overflow: hidden; border: 1px solid var(--border); }
.progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.5s ease; }
.progress-done { background: var(--warn); }
.pot-timer { font-size: 11px; color: var(--muted); }
.btn-harvest { background: var(--accent); color: #fff; border-color: var(--accent-hover); }
.strain-table { overflow-x: auto; }
.strain-table table { width: 100%; border-collapse: collapse; font-size: 12px; }
.strain-table th, .strain-table td { text-align: left; padding: 5px 8px; border-bottom: 1px solid var(--border); }
.strain-table th { color: var(--muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
.td-desc { font-size: 11px; color: var(--muted); }
.td-effect { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
.stash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; }
.stash-item { border: 1px solid var(--border); border-radius: 2px; padding: 10px; background: var(--panel); }
.stash-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
.stash-info { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
.stash-actions { display: flex; gap: 4px; align-items: center; }
.input-sm { width: 56px; }
.btn-sm { font-size: 11px; padding: 3px 8px; }
.btn-use { background: #7c3aed; border-color: #6d28d9; color: #fff; }

</style>
