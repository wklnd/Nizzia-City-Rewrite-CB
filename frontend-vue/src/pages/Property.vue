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
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'
import { fmt } from '../utils/format'

const { store, ensurePlayer } = usePlayer()
const toast = useToast()
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

function imageUrl(id){ return `/assets/images/property_${id}.jpg` }

async function loadHome(){
  if (!store.player?.user) return
  loading.value = true
  error.value = ''
  imageOk.value = true
  try {
    const { data } = await api.get('/realestate/home')
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
    const { data } = await api.get('/realestate/catalog')
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

async function payUpkeep(){
  if (!store.player?.user) return
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/realestate/pay-upkeep')
    if (data?.money != null) store.mergePartial({ money: data.money })
    await loadHome()
    toast.ok('Upkeep paid')
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to pay upkeep')
  } finally {
    busy.value = false
  }
}

onMounted(async () => { await ensurePlayer(); await Promise.all([loadHome(), loadCatalog()]) })
watch(() => store.player?.user, async (v, ov) => { if (v && v !== ov) { await loadHome(); await loadCatalog() } })
</script>

<style scoped>
.prop { margin-top: 10px; }
.card__media { width: 100%; max-width: 720px; margin: 0 auto; aspect-ratio: 16/9; background: var(--bg-alt); border-radius: 2px; overflow: hidden; }
.card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card__placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 12px; }
.card__body { padding: 10px; display: flex; flex-direction: column; gap: 6px; }
.card__row { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; }
.card__title { font-weight: 600; }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; margin-top: 6px; }
.panel--soft { background: var(--bg-alt); }
.panel__title { font-weight: 600; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; }
.kv__row { display: flex; justify-content: space-between; font-size: 12px; }
.chip--ok::before { content: '[OK]'; color: var(--ok); font-weight: 700; font-size: 10px; }
.owned-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
.owned-card { border: 1px solid var(--border); border-radius: 2px; background: var(--panel); overflow: hidden; }
.owned-media { position: relative; width: 100%; aspect-ratio: 16/9; background: var(--bg-alt); }
.owned-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.owned-badge { position: absolute; right: 6px; top: 6px; background: var(--panel); color: var(--text); padding: 1px 6px; border-radius: 2px; font-size: 11px; border: 1px solid var(--border); }
.owned-body { padding: 6px; }
.owned-title { font-weight: 600; font-size: 12px; }
.owned-meta { font-size: 11px; color: var(--muted); }
</style>
