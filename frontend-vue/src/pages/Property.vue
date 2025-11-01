<template>
  <section>
    <h2>Property</h2>
    <p class="muted">Your current home, upgrades, and upkeep.</p>

    <div v-if="ownedSummary.length" class="u-mt-6">
      <h3>Your Properties</h3>
      <div class="owned-grid u-mt-4">
        <div class="owned-card" v-for="o in ownedSummary" :key="o.id">
          <div class="owned-media">
            <img v-if="imageOkMap[o.id]" :src="imageUrl(o.id)" :alt="o.name" @error="() => (imageOkMap[o.id] = false)" />
            <div v-else class="card__placeholder">{{ o.name }}</div>
            <div class="owned-badge" v-if="o.count>1">×{{ o.count }}</div>
          </div>
          <div class="owned-body">
            <div class="owned-title">{{ o.name }}</div>
            <div class="owned-meta">Base Happiness Max: {{ o.baseHappyMax }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="muted u-mt-6">Loading property…</div>
    <div v-else-if="error" class="error u-mt-6">{{ error }}</div>

    <div v-else class="prop">
      <div class="card">
        <div class="card__media">
          <img v-if="imageOk && home?.image" :src="home.image" :alt="home?.name || 'Home'" @error="imageOk=false" />
          <div v-else class="card__placeholder">{{ home?.name || home?.id || 'Home' }}</div>
        </div>
        <div class="card__body">
          <div class="card__row">
            <div class="card__title">{{ home?.name }}</div>
            <div class="muted">Happiness: <strong>{{ home?.happy }}</strong> / {{ home?.happyMax }}</div>
          </div>

          <div class="grid2">
            <div class="panel panel--soft">
              <div class="panel__title">Upkeep</div>
              <div class="kv">
                <div class="kv__row"><span class="k">Daily cost</span><span class="v">${{ fmt(home?.upkeep) }}</span></div>
                <div class="kv__row"><span class="k">Due</span><span class="v">${{ fmt(home?.upkeepDue) }}</span></div>
                <div class="kv__row"><span class="k">Last paid</span><span class="v">{{ lastPaid }}</span></div>
              </div>
              <div class="actions">
                <button class="btn btn--primary" :disabled="busy || Number(home?.upkeepDue||0) <= 0 || notEnoughMoney" @click="payUpkeep">Pay Upkeep</button>
                <span class="muted" v-if="Number(home?.upkeepDue||0) <= 0">Nothing due</span>
                <span class="muted" v-else-if="notEnoughMoney">Not enough money</span>
              </div>
            </div>

            <div class="panel panel--soft">
              <div class="panel__title">Installed upgrades</div>
              <div class="chips" v-if="installed.length">
                <span class="chip chip--ok" v-for="u in installed" :key="u.id">{{ u.name }}</span>
              </div>
              <div class="muted" v-else>No upgrades installed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '../api/client'
import { usePlayerStore } from '../stores/player'

const store = usePlayerStore()
const loading = ref(false)
const error = ref('')
const home = ref(null)
const imageOk = ref(true)
const busy = ref(false)
const catalog = ref([])
const imageOkMap = ref({})

const notEnoughMoney = computed(() => Number(store.player?.money||0) < Number(home.value?.upkeepDue||0))

const lastPaid = computed(() => {
  const d = home.value?.lastUpkeepPaidAt ? new Date(home.value.lastUpkeepPaidAt) : null
  if (!d) return '—'
  return d.toLocaleString()
})

function humanizeUpgradeId(id){
  if (!id) return ''
  return String(id).split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')
}

const installed = computed(() => {
  const up = home.value?.upgrades || {}
  const names = home.value?.upgradeNames || {}
  return Object.entries(up)
    .filter(([, level]) => Number(level||0) > 0)
    .map(([id]) => ({ id, name: names[id] || humanizeUpgradeId(id) }))
})

function fmt(n){ return Number(n||0).toLocaleString() }
function imageUrl(id){ return `/assets/images/property_${id}.jpg` }

async function loadHome(){
  if (!store.player?.user) return
  loading.value = true
  error.value = ''
  imageOk.value = true
  try {
    const { data } = await api.get('/realestate/home', { params: { userId: store.player.user } })
    home.value = data
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to load property'
  } finally {
    loading.value = false
  }
}

async function loadCatalog(){
  if (!store.player?.user) return
  try {
    const { data } = await api.get('/realestate/catalog', { params: { userId: store.player.user } })
    catalog.value = data?.properties || []
    const map = imageOkMap.value || {}
    catalog.value.forEach(p => { if (!(p.id in map)) map[p.id] = true })
    imageOkMap.value = map
  } catch {}
}

const ownedSummary = computed(() => {
  const map = new Map()
  const defs = new Map(catalog.value.map(p => [p.id, p]))
  const props = store.player?.properties || []
  for (const e of props) {
    const id = e.propertyId
    const count = map.get(id)?.count || 0
    const def = defs.get(id) || { id, name: id, baseHappyMax: 0 }
    map.set(id, { id, name: def.name || id, baseHappyMax: def.baseHappyMax || 0, count: count + 1 })
  }
  return Array.from(map.values())
})

async function ensurePlayer(){
  if (store.player?.user) return
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('nc_user') : null
    if (raw) {
      let uid = raw
      try { const o = JSON.parse(raw); uid = o?._id || o?.id || raw } catch {}
      await store.loadByUser(uid)
    }
  } catch {}
}

async function payUpkeep(){
  if (!store.player?.user) return
  busy.value = true
  error.value = ''
  try {
    await api.post('/realestate/pay-upkeep', { userId: store.player.user })
    await store.loadByUser(store.player.user)
    await loadHome()
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to pay upkeep'
  } finally {
    busy.value = false
  }
}

onMounted(async () => { await ensurePlayer(); await Promise.all([loadHome(), loadCatalog()]) })
watch(() => store.player?.user, async (v, ov) => { if (v && v !== ov) { await loadHome(); await loadCatalog() } })
</script>

<style scoped>
.prop { margin-top: 12px; }
.card { border: 1px solid var(--border, #2b2f38); border-radius: 10px; overflow: hidden; background: rgba(255,255,255,0.02); }
.card__media { width: 100%; aspect-ratio: 16/9; background: #13161c; }
.card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card__placeholder { width: 100%; height: 100%; display:flex; align-items:center; justify-content:center; color: var(--muted, #99a2b2); }
.card__body { padding: 12px; display:flex; flex-direction: column; gap: 8px; }
.card__row { display:flex; justify-content: space-between; align-items: baseline; }
.card__title { font-weight: 600; }

.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-top: 6px; }
.panel { border: 1px solid var(--border, #2b2f38); border-radius: 8px; padding: 10px; background: var(--panel, #171a2b); }
.panel--soft { background: rgba(255,255,255,0.02); }
.panel__title { font-weight: 600; margin-bottom: 6px; }
.kv { display: grid; gap: 6px; }
.kv__row { display:flex; justify-content: space-between; }
.k { color: var(--muted, #99a2b2); }
.v { font-weight: 600; }
.chips { display:flex; gap: 6px; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; border: 1px solid var(--border, #2b2f38); background: rgba(255,255,255,0.03); font-size: 0.8rem; }
.chip--ok::before { content: '✓'; color: #38d39f; font-weight: 700; }
.actions { margin-top: 8px; display:flex; gap: 8px; align-items: center; }
.btn { border: 1px solid var(--border, #2b2f38); background: rgba(255,255,255,0.06); padding: 6px 10px; border-radius: 8px; cursor: pointer; color: var(--text, #e8eaf6); }
.btn[disabled] { opacity: 0.5; cursor: not-allowed; }
.btn--primary { background: #335a3b; color: #a3d977; border-color: #335a3b; }
.error { color: #ff7b7b; }

/* Owned grid */
.owned-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.owned-card { border: 1px solid var(--border, #2b2f38); border-radius: 10px; background: rgba(255,255,255,0.02); overflow: hidden; }
.owned-media { position: relative; width: 100%; aspect-ratio: 16/9; background: #13161c; }
.owned-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.owned-badge { position: absolute; right: 8px; top: 8px; background: rgba(0,0,0,0.6); color: #fff; padding: 2px 8px; border-radius: 999px; font-size: 12px; border: 1px solid var(--border, #2b2f38); }
.owned-body { padding: 8px; }
.owned-title { font-weight: 600; }
.owned-meta { font-size: 12px; color: var(--muted, #99a2b2); }
</style>
