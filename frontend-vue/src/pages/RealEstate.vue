<template>
  <section>
    <h2>Property Broker</h2>
    <p class="muted">Browse properties, buy new homes, and set your active residence.</p>

    <div class="broker-toolbar u-mt-6">
      <div class="broker-toolbar__left">
        <strong>Money:</strong>
        <span>{{ money }}</span>
      </div>
      <div class="broker-toolbar__right">
        <label class="toggle"><input type="checkbox" v-model="showOwnedOnly" /> Show owned only</label>
      </div>
    </div>

    <div v-if="loading" class="u-mt-6 muted">Loading properties…</div>

    <div class="grid u-mt-6" v-else>
      <div v-for="p in filtered" :key="p.id" class="card">
        <div class="card__media">
          <img v-if="imageOk[p.id]" :src="imageUrl(p.id)" :alt="p.name" @error="() => (imageOk[p.id] = false)" />
          <div v-else class="card__placeholder">{{ p.name }}</div>
        </div>
        <div class="card__body">
          <div class="card__row">
            <div class="card__title">{{ p.name }}</div>
            <div class="status" :class="{ 'status--active': p.active, 'status--owned': p.owned && !p.active }">
              <template v-if="p.active">Active</template>
              <template v-else-if="p.owned">Owned</template>
              <template v-else>For Sale</template>
            </div>
          </div>
          <div class="card__meta">
            <div>Base Happiness Max: <strong>{{ p.baseHappyMax }}</strong></div>
            <div v-if="!p.owned">Cost: <strong>${{ formatNumber(p.cost) }}</strong></div>
            <div v-else>Upgrades: <strong>{{ upgradeCount(p) }}</strong> / {{ p.upgradeCapacity ?? 3 }}</div>
          </div>

          <div v-if="p.owned" class="card__upgrades">
            <div class="card__upgrades-title">Installed upgrades</div>
            <div v-if="installedUpgrades(p).length" class="chips">
              <span class="chip chip--ok" v-for="u in installedUpgrades(p)" :key="u.id">{{ u.name }}</span>
            </div>
            <div v-else class="muted">No upgrades installed</div>

            <div class="card__upgrades-title u-mt-4">Available upgrades</div>
            <div class="upgrade-list">
              <div class="upgrade" v-for="u in availableUpgrades(p)" :key="u.id">
                <div class="upgrade__name">{{ u.name }}</div>
                <div class="upgrade__spacer"></div>
                <div class="upgrade__price">${{ formatNumber(u.cost) }}</div>
                <button class="btn btn--small btn--primary"
                        :disabled="busy || Number(store.player?.money||0) < Number(u.cost||0)"
                        @click="buyUpgrade(p, u.id)">Buy</button>
              </div>
              <div v-if="availableUpgrades(p).length === 0" class="muted">No more upgrades available</div>
            </div>
          </div>

          <div class="card__actions">
            <template v-if="!p.owned">
              <button class="btn btn--primary" :disabled="busy || Number(store.player?.money||0) < Number(p.cost||0)" @click="buy(p, true)">Buy & Set Active</button>
              <button class="btn" :disabled="busy || Number(store.player?.money||0) < Number(p.cost||0)" @click="buy(p, false)">Buy Only</button>
            </template>
            <template v-else-if="!p.active">
              <button class="btn btn--primary" :disabled="busy" @click="setActive(p)">Set Active</button>
            </template>
            <template v-else>
              <button class="btn" disabled>Current Home</button>
            </template>
          </div>
        </div>
      </div>
      <div v-if="!error && filtered.length === 0" class="empty muted">No properties to show</div>
    </div>

    <div v-if="error" class="error u-mt-6">{{ error }}</div>
  </section>
</template>

<script setup>
      import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '../api/client'
import { usePlayerStore } from '../stores/player'

const store = usePlayerStore()
const money = computed(() => `$${Number(store.player?.money || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`)

const catalog = ref([])
const error = ref('')
const busy = ref(false)
const showOwnedOnly = ref(false)
const imageOk = reactive({})
const loading = ref(false)

function imageUrl(id){
  return `/assets/images/property_${id}.jpg`
}
function formatNumber(n){
  return Number(n || 0).toLocaleString()
}
function upgradeCount(p){
  const u = p.upgrades || {}
  return Object.values(u).reduce((a,b)=> a + (Number(b||0) > 0 ? 1 : 0), 0)
}

// Mirror backend upgrade names and level-1 costs for display
const UPGRADE_NAMES = {
  hot_tub: 'Hot Tub',
  home_theater: 'Home Theater',
  garden: 'Zen Garden',
  vault: 'Secure Vault',
}
const UPGRADE_COSTS_L1 = {
  hot_tub: 250000,
  home_theater: 500000,
  garden: 150000,
  vault: 1000000,
}

function installedUpgrades(p){
  const up = p.upgrades || {}
  return Object.entries(up)
    .filter(([, level]) => Number(level||0) > 0)
    .map(([id]) => ({ id, name: UPGRADE_NAMES[id] || id }))
}
function availableUpgrades(p){
  const limits = p.upgradeLimits || {}
  const up = p.upgrades || {}
  return Object.keys(limits)
    .filter((id) => Number(up[id]||0) < Number(limits[id]||1))
    .map((id) => ({ id, name: UPGRADE_NAMES[id] || id, cost: UPGRADE_COSTS_L1[id] || 0 }))
}

const filtered = computed(() => showOwnedOnly.value ? catalog.value.filter(p => p.owned) : catalog.value)

async function loadCatalog(){
  if (!store.player?.user) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/realestate/catalog', { params: { userId: store.player.user } })
    catalog.value = data?.properties || []
    // init imageOk
    catalog.value.forEach(p => { if (!(p.id in imageOk)) imageOk[p.id] = true })
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to load properties'
  } finally {
    loading.value = false
  }
}

async function ensurePlayer(){
  if (store.player?.user) return
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('nc_user') : null
    if (raw) {
      let uid = raw
      try {
        const obj = JSON.parse(raw)
        uid = obj?._id || obj?.id || raw
      } catch {}
      await store.loadByUser(uid)
    }
  } catch {}
}

async function buy(p, setActive){
  if (!store.player?.user) return
  busy.value = true
  error.value = ''
  try {
    await api.post('/realestate/buy', { userId: store.player.user, propertyId: p.id, setActive: !!setActive })
    // refresh money and player happy/home via store
    await store.loadByUser(store.player.user)
    await loadCatalog()
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to buy property'
  } finally {
    busy.value = false
  }
}

async function setActive(p){
  if (!store.player?.user) return
  busy.value = true
  error.value = ''
  try {
    await api.post('/realestate/set-active', { userId: store.player.user, propertyId: p.id })
    await store.loadByUser(store.player.user)
    await loadCatalog()
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to set active property'
  } finally {
    busy.value = false
  }
}

async function buyUpgrade(p, upgradeId){
  if (!store.player?.user) return
  busy.value = true
  error.value = ''
  try {
    await api.post('/realestate/upgrade', { userId: store.player.user, propertyId: p.id, upgradeId })
    await store.loadByUser(store.player.user)
    await loadCatalog()
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to purchase upgrade'
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await ensurePlayer()
  await loadCatalog()
})

watch(() => store.player?.user, async (v, ov) => {
  if (v && v !== ov) await loadCatalog()
})
</script>

<style scoped>
.broker-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.toggle { font-size: 0.9rem; color: var(--muted, #99a2b2); }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.card {
  border: 1px solid var(--border, #2b2f38);
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.card__media { width: 100%; aspect-ratio: 16/9; background: #13161c; }
.card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card__placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--muted, #99a2b2); }
.card__body { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.card__row { display: flex; justify-content: space-between; align-items: baseline; }
.card__title { font-weight: 600; }
.card__meta { font-size: 0.9rem; color: var(--muted, #99a2b2); display: grid; gap: 2px; }
.card__upgrades { margin-top: 6px; }
.card__upgrades-title { font-size: 0.85rem; color: var(--muted, #99a2b2); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; border: 1px solid var(--border, #2b2f38); background: rgba(255,255,255,0.03); font-size: 0.8rem; }
.chip--ok::before { content: '✓'; color: #38d39f; font-weight: 700; }
.upgrade-list { display: grid; gap: 6px; margin-top: 6px; }
.upgrade { display: flex; align-items: center; gap: 8px; }
.upgrade__name { font-size: 0.95rem; }
.upgrade__spacer { flex: 1; }
.upgrade__price { font-size: 0.9rem; color: var(--muted, #99a2b2); }
.btn--small { padding: 4px 8px; font-size: 0.85rem; border-radius: 6px; }
.card__actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }

.btn { border: 1px solid var(--border, #2b2f38); background: rgba(255,255,255,0.03); padding: 6px 10px; border-radius: 8px; cursor: pointer; }
.btn[disabled] { opacity: 0.5; cursor: not-allowed; }
.btn--primary { background: #2563eb; color: white; border-color: #1d4ed8; }

.status { font-size: 0.8rem; color: var(--muted, #99a2b2); }
.status--owned { color: #e5b400; }
.status--active { color: #38d39f; font-weight: 600; }

.error { color: #ff7b7b; }
.empty { grid-column: 1 / -1; padding: 12px; }
</style>
