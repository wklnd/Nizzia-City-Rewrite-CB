<template>
  <section>
    <h2>Real Estate</h2>
    <p class="muted">Manage your homes, properties, and businesses.</p>

    <!-- ─── Tab bar ──────────────────────────────────── -->
    <div class="tab-bar u-mt-6">
      <button class="tab" :class="{ 'tab--active': tab === 'houses' }" @click="tab = 'houses'">🏠 Houses</button>
      <button class="tab" :class="{ 'tab--active': tab === 'properties' }" @click="tab = 'properties'">🏭 Properties</button>
      <button class="tab" :class="{ 'tab--active': tab === 'businesses' }" @click="tab = 'businesses'">💼 Businesses</button>
    </div>

    <!-- ═══════════ HOUSES TAB ═══════════ -->
    <div v-if="tab === 'houses'">
      <div v-if="ownedSummary.length" class="u-mt-6">
        <h3>Your Properties</h3>
        <div class="owned-grid u-mt-4">
          <div class="owned-card" v-for="o in ownedSummary" :key="o.id">
            <div class="owned-media">
              <img v-if="imageOk[o.id]" :src="imageUrl(o.id)" :alt="o.name" @error="() => (imageOk[o.id] = false)" />
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
            <div class="count-badge" v-if="(ownedCounts[p.id]||0) > 1">×{{ ownedCounts[p.id] }}</div>
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
              <div v-else>Upgrades: <strong>{{ upgradeCount(p) }}</strong> / {{ capacity(p) }}</div>
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
                <button class="btn btn--primary" :disabled="busy || Number(store.player?.money||0) < Number(p.cost||0)" @click="buyHouse(p, true)">Buy & Set Active</button>
                <button class="btn" :disabled="busy || Number(store.player?.money||0) < Number(p.cost||0)" @click="buyHouse(p, false)">Buy Only</button>
              </template>
              <template v-else-if="!p.active">
                <button class="btn btn--primary" :disabled="busy" @click="setActive(p)">Set Active</button>
                <button class="btn" :disabled="busy || Number(store.player?.money||0) < Number(p.cost||0)" @click="buyHouse(p, false)">Buy Another</button>
              </template>
              <template v-else>
                <button class="btn" disabled>Current Home</button>
                <button class="btn btn--primary" :disabled="busy || Number(store.player?.money||0) < Number(p.cost||0)" @click="buyHouse(p, false)">Buy Another</button>
              </template>
            </div>
          </div>
        </div>
        <div v-if="!error && filtered.length === 0" class="empty muted">No properties to show</div>
      </div>
    </div>

    <!-- ═══════════ PROPERTIES TAB (Warehouses) ═══════════ -->
    <div v-if="tab === 'properties'">
      <div class="u-mt-6">
        <h3>Warehouses</h3>
        <p class="muted">Purchase a warehouse to start your grow operation. Upgrade to unlock more pot slots.</p>

        <!-- Current warehouse -->
        <div class="panel u-mt-4" v-if="growData.warehouse">
          <h4>Your Warehouse</h4>
          <div class="wh-info">
            <div class="wh-name">{{ currentWhDef?.name || growData.warehouse.type }}</div>
            <div class="wh-tags">
              <span class="pill">Pots: {{ growData.warehouse.pots }} / {{ growData.warehouse.maxPots }}</span>
            </div>
            <div class="wh-actions u-mt-4">
              <router-link to="/grow" class="btn btn--primary">Open Grow Operation →</router-link>
            </div>
          </div>
        </div>
        <div class="panel u-mt-4" v-else>
          <div class="muted">You don't own a warehouse yet. Pick one below to get started.</div>
        </div>

        <!-- Warehouse catalog -->
        <div class="grid u-mt-6">
          <div v-for="w in warehouseCatalog" :key="w.id" class="card"
               :class="{ 'card--active-border': growData.warehouse?.type === w.id }">
            <div class="card__body">
              <div class="card__row">
                <div class="card__title">{{ w.name }}</div>
                <div class="status" :class="{ 'status--active': growData.warehouse?.type === w.id }">
                  <template v-if="growData.warehouse?.type === w.id">Current</template>
                  <template v-else>Available</template>
                </div>
              </div>
              <div class="card__meta">
                <div>{{ w.description }}</div>
                <div>Max Pots: <strong>{{ w.maxPots }}</strong></div>
                <div>Cost: <strong>${{ formatNumber(w.cost) }}</strong></div>
              </div>
              <div class="card__actions">
                <button class="btn btn--primary"
                        :disabled="busy || growData.warehouse?.type === w.id || Number(store.player?.money||0) < Number(w.cost||0)"
                        @click="buyWarehouse(w)">
                  {{ growData.warehouse ? 'Upgrade' : 'Buy' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════ BUSINESSES TAB ═══════════ -->
    <div v-if="tab === 'businesses'">
      <div class="u-mt-6">
        <h3>Your Businesses</h3>
        <p class="muted">Buy, upgrade, and manage businesses for passive income. Vice businesses earn more but attract police raids.</p>

        <!-- Collect All banner -->
        <div v-if="myBiz.length" class="biz-banner u-mt-4">
          <div class="biz-banner__left">
            <span class="biz-banner__label">Total Pending:</span>
            <span class="biz-banner__value">${{ formatNumber(totalPending) }}</span>
            <span class="biz-banner__sep">|</span>
            <span class="biz-banner__label">Net Income/hr:</span>
            <span class="biz-banner__value">${{ formatNumber(totalNetIncome) }}/hr</span>
          </div>
          <button class="btn btn--primary" :disabled="bizBusy || totalPending <= 0" @click="doCollectAll">
            Collect All
          </button>
        </div>

        <!-- Owned businesses -->
        <div v-if="myBiz.length" class="biz-grid u-mt-4">
          <div v-for="b in myBiz" :key="b._id" class="biz-card" :class="{ 'biz-card--shutdown': b.isShutdown }">
            <div class="biz-card__header">
              <div class="biz-card__icon">{{ bizIcon(b.businessId) }}</div>
              <div class="biz-card__title-group">
                <div class="biz-card__name">{{ b.name }}</div>
                <div class="biz-card__type">{{ bizCfg(b.businessId)?.name }} · <span :class="b.isShutdown ? 'tag--danger' : 'tag--ok'">{{ b.isShutdown ? 'RAIDED' : 'ACTIVE' }}</span></div>
              </div>
              <div class="biz-card__tier">Tier {{ b.level }}/5</div>
            </div>

            <div class="biz-card__stats">
              <div class="biz-stat"><span class="biz-stat__label">Income</span><span class="biz-stat__value">${{ formatNumber(b.income) }}/hr</span></div>
              <div class="biz-stat"><span class="biz-stat__label">Upkeep</span><span class="biz-stat__value">${{ formatNumber(b.upkeep) }}/hr</span></div>
              <div class="biz-stat"><span class="biz-stat__label">Net</span><span class="biz-stat__value" :class="b.netIncome > 0 ? 'val--pos' : 'val--neg'">${{ formatNumber(b.netIncome) }}/hr</span></div>
              <div class="biz-stat"><span class="biz-stat__label">Raid Risk</span><span class="biz-stat__value" :class="b.raidChance > 0.10 ? 'val--neg' : ''">{{ (b.raidChance * 100).toFixed(1) }}%</span></div>
              <div class="biz-stat"><span class="biz-stat__label">Staff</span><span class="biz-stat__value">{{ b.staff }} / {{ bizCfg(b.businessId)?.maxStaff || '?' }}</span></div>
              <div class="biz-stat"><span class="biz-stat__label">Pending</span><span class="biz-stat__value">${{ formatNumber(b.pendingIncome) }}</span></div>
            </div>

            <div class="biz-card__actions">
              <button class="btn btn--small btn--primary" :disabled="bizBusy || b.pendingIncome <= 0" @click="doCollect(b)">Collect</button>
              <button class="btn btn--small" :disabled="bizBusy || b.level >= 5 || Number(store.player?.money||0) < upgradeCost(b)" @click="doUpgrade(b)">
                Upgrade (${{ formatNumber(upgradeCost(b)) }})
              </button>
              <button class="btn btn--small" :disabled="bizBusy || b.staff >= (bizCfg(b.businessId)?.maxStaff || 0)" @click="doHire(b)">
                Hire ($5,000)
              </button>
              <button class="btn btn--small" :disabled="bizBusy || b.staff <= 0" @click="doFire(b)">Fire</button>
              <button class="btn btn--small" :disabled="bizBusy" @click="startRename(b)">Rename</button>
              <button class="btn btn--small btn--danger" :disabled="bizBusy" @click="doSell(b)">Sell</button>
            </div>

            <!-- inline rename -->
            <div v-if="renamingId === b._id" class="biz-rename u-mt-4">
              <input v-model="renameText" class="biz-rename__input" maxlength="30" placeholder="New name…" @keyup.enter="doRename(b)" />
              <button class="btn btn--small btn--primary" :disabled="bizBusy" @click="doRename(b)">Save</button>
              <button class="btn btn--small" @click="renamingId = null">Cancel</button>
            </div>
          </div>
        </div>
        <div v-else class="panel u-mt-4">
          <div class="muted">You don't own any businesses yet. Browse the catalog below to get started.</div>
        </div>

        <!-- Business Catalog -->
        <h3 class="u-mt-8">Business Catalog</h3>
        <div class="biz-filter u-mt-4">
          <button class="tab" :class="{ 'tab--active': bizFilter === 'all' }" @click="bizFilter = 'all'">All</button>
          <button class="tab" :class="{ 'tab--active': bizFilter === 'legit' }" @click="bizFilter = 'legit'">Legit</button>
          <button class="tab" :class="{ 'tab--active': bizFilter === 'vice' }" @click="bizFilter = 'vice'">Vice</button>
        </div>

        <div v-if="bizLoading" class="u-mt-4 muted">Loading catalog…</div>
        <div v-else class="biz-catalog u-mt-4">
          <div v-for="c in filteredCatalog" :key="c.id" class="biz-cat-card">
            <div class="biz-cat-card__icon">{{ bizIcon(c.id) }}</div>
            <div class="biz-cat-card__body">
              <div class="biz-cat-card__row">
                <strong>{{ c.name }}</strong>
                <span class="pill" :class="c.category === 'vice' ? 'pill--vice' : 'pill--legit'">{{ c.category }}</span>
              </div>
              <div class="muted" style="font-size:11px;">{{ c.description }}</div>
              <div class="biz-cat-card__meta">
                <span>Cost: <strong>${{ formatNumber(c.cost) }}</strong></span>
                <span>Income: <strong>${{ formatNumber(c.baseIncome) }}/hr</strong></span>
                <span>Upkeep: <strong>${{ formatNumber(c.upkeep) }}/hr</strong></span>
                <span>Raid: <strong>{{ (c.baseRaidChance * 100).toFixed(0) }}%</strong></span>
                <span>Staff: <strong>{{ c.maxStaff }}</strong></span>
              </div>
            </div>
            <button class="btn btn--primary" :disabled="bizBusy || Number(store.player?.money||0) < c.cost" @click="doBuy(c.id)">
              Buy
            </button>
          </div>
          <div v-if="filteredCatalog.length === 0" class="empty muted">No businesses match the filter.</div>
        </div>
      </div>
    </div>

    <div v-if="error" class="error u-mt-6">{{ error }}</div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api/client'
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'
import { fmtMoney, fmtInt as formatNumber } from '../utils/format'

const { store, ensurePlayer, reloadPlayer } = usePlayer()
const toast = useToast()
const route = useRoute()
const money = computed(() => fmtMoney(store.player?.money))

const VALID_TABS = ['houses', 'properties', 'businesses']
const tab = ref(VALID_TABS.includes(route.query.tab) ? route.query.tab : 'houses')
const catalog = ref([])
const error = ref('')
const busy = ref(false)
const showOwnedOnly = ref(false)
const imageOk = reactive({})
const loading = ref(false)

// Grow / warehouse state
const growData = ref({ warehouse: null })
const warehouseCatalog = ref([])
const currentWhDef = computed(() =>
  growData.value.warehouse ? warehouseCatalog.value.find(w => w.id === growData.value.warehouse.type) || null : null
)

// ── Business state ──
const bizCatalogList = ref([])
const myBiz = ref([])
const bizBusy = ref(false)
const bizLoading = ref(false)
const bizFilter = ref('all')
const renamingId = ref(null)
const renameText = ref('')

const BIZ_ICONS = {
  laundromat: '🧺', mechanic: '🔧', restaurant: '🍽️', gym_biz: '🏋️',
  bar: '🍺', nightclub: '🌃', strip_club: '💃', dispensary: '🌿', gun_shop: '🔫', casino_biz: '🎰',
}
function bizIcon(id) { return BIZ_ICONS[id] || '🏢' }
function bizCfg(id) { return bizCatalogList.value.find(c => c.id === id) || null }
function upgradeCost(b) {
  const cfg = bizCfg(b.businessId)
  if (!cfg) return Infinity
  const TIER_MULTS = { 1: 0.25, 2: 0.5, 3: 1.0, 4: 2.0, 5: 4.0 }
  const nextLevel = (b.level || 0) + 1
  return Math.floor(cfg.cost * (TIER_MULTS[nextLevel] || 999))
}

const totalPending = computed(() => myBiz.value.reduce((s, b) => s + (b.pendingIncome || 0), 0))
const totalNetIncome = computed(() => myBiz.value.reduce((s, b) => s + (b.netIncome || 0), 0))
const filteredCatalog = computed(() =>
  bizFilter.value === 'all' ? bizCatalogList.value : bizCatalogList.value.filter(c => c.category === bizFilter.value)
)

const ownedCounts = computed(() => {
  const map = {}
  const props = store.player?.properties || []
  for (const e of props) {
    map[e.propertyId] = (map[e.propertyId] || 0) + 1
  }
  return map
})
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

function imageUrl(id){
  return `/assets/images/property_${id}.jpg`
}

function upgradeCount(p){
  const u = p.upgrades || {}
  return Object.values(u).reduce((a,b)=> a + Number(b||0), 0)
}
function capacity(p){
  if (typeof p.upgradeCapacity === 'number') return p.upgradeCapacity
  const limits = p.upgradeLimits || {}
  return Object.values(limits).reduce((a,b)=> a + Number(b||0), 0)
}

function humanizeUpgradeId(id){
  if (!id) return ''
  return String(id).split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')
}

function installedUpgrades(p){
  const up = p.upgrades || {}
  const names = p.upgradeNames || {}
  return Object.entries(up)
    .filter(([, level]) => Number(level||0) > 0)
    .map(([id]) => ({ id, name: names[id] || humanizeUpgradeId(id) }))
}
function availableUpgrades(p){
  const limits = p.upgradeLimits || {}
  const up = p.upgrades || {}
  const names = p.upgradeNames || {}
  const costs = p.upgradeCosts || {}
  return Object.keys(limits)
    .filter((id) => Number(up[id]||0) < Number(limits[id]||1))
    .map((id) => ({ id, name: names[id] || humanizeUpgradeId(id), cost: costs[id] || 0 }))
}

const filtered = computed(() => showOwnedOnly.value ? catalog.value.filter(p => p.owned) : catalog.value)



async function loadCatalog(){
  if (!store.player?.user) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/realestate/catalog')
    catalog.value = data?.properties || []
    catalog.value.forEach(p => { if (!(p.id in imageOk)) imageOk[p.id] = true })
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to load properties'
  } finally {
    loading.value = false
  }
}

async function loadGrowData() {
  try {
    const [myRes, whRes] = await Promise.all([
      api.get('/grow/my'),
      api.get('/grow/warehouses'),
    ])
    const d = myRes.data || myRes
    growData.value = { warehouse: d.warehouse || null }
    warehouseCatalog.value = (whRes.data || whRes).warehouses || []
  } catch { /* silent */ }
}



async function buyHouse(p, setActive){
  if (!store.player?.user) return
  busy.value = true
  try {
    const { data } = await api.post('/realestate/buy', { propertyId: p.id, setActive: !!setActive })
    store.mergePartial({ money: data.money })
    await loadCatalog()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to buy property')
  } finally {
    busy.value = false
  }
}

async function setActive(p){
  if (!store.player?.user) return
  busy.value = true
  try {
    const { data } = await api.post('/realestate/set-active', { propertyId: p.id })
    store.mergePartial({ happiness: { ...store.player.happiness, happy: data.happy, happyMax: data.happyMax } })
    await loadCatalog()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to set active property')
  } finally {
    busy.value = false
  }
}

async function buyUpgrade(p, upgradeId){
  if (!store.player?.user) return
  busy.value = true
  try {
    const { data } = await api.post('/realestate/upgrade', { propertyId: p.id, upgradeId })
    store.mergePartial({ money: data.money, happiness: { ...store.player.happiness, happy: data.happy, happyMax: data.happyMax } })
    await loadCatalog()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to purchase upgrade')
  } finally {
    busy.value = false
  }
}

async function buyWarehouse(w) {
  busy.value = true
  try {
    await api.post('/grow/buy-warehouse', { warehouseId: w.id })
    await reloadPlayer()
    await loadGrowData()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to buy warehouse')
  } finally {
    busy.value = false
  }
}

// ── Business loaders ──
async function loadBizCatalog() {
  bizLoading.value = true
  try {
    const { data } = await api.get('/business/catalog')
    bizCatalogList.value = data?.catalog || []
  } catch { /* silent */ }
  finally { bizLoading.value = false }
}

async function loadMyBiz() {
  try {
    const { data } = await api.get('/business/my')
    myBiz.value = data?.businesses || []
  } catch { /* silent */ }
}

async function refreshBiz() {
  await loadMyBiz()
}

// ── Business actions ──
async function doBuy(businessId) {
  bizBusy.value = true
  try {
    const { data } = await api.post('/business/buy', { businessId })
    if (data?.money != null) store.mergePartial({ money: data.money })
    await refreshBiz()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed to buy business') }
  finally { bizBusy.value = false }
}

async function doSell(b) {
  if (!confirm(`Sell ${b.name}? You'll get 50% cost back + pending income.`)) return
  bizBusy.value = true
  try {
    const { data } = await api.post('/business/sell', { bizId: b._id })
    if (data?.money != null) store.mergePartial({ money: data.money })
    await refreshBiz()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed to sell') }
  finally { bizBusy.value = false }
}

async function doUpgrade(b) {
  bizBusy.value = true
  try {
    const { data } = await api.post('/business/upgrade', { bizId: b._id })
    if (data?.money != null) store.mergePartial({ money: data.money })
    await refreshBiz()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Upgrade failed') }
  finally { bizBusy.value = false }
}

async function doHire(b) {
  bizBusy.value = true
  try {
    const { data } = await api.post('/business/hire', { bizId: b._id, count: 1 })
    if (data?.money != null) store.mergePartial({ money: data.money })
    await refreshBiz()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Hire failed') }
  finally { bizBusy.value = false }
}

async function doFire(b) {
  bizBusy.value = true
  try {
    await api.post('/business/fire', { bizId: b._id, count: 1 })
    await refreshBiz()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Fire failed') }
  finally { bizBusy.value = false }
}

async function doCollect(b) {
  bizBusy.value = true
  try {
    const { data } = await api.post('/business/collect', { bizId: b._id })
    if (data?.money != null) store.mergePartial({ money: data.money })
    await refreshBiz()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Collect failed') }
  finally { bizBusy.value = false }
}

async function doCollectAll() {
  bizBusy.value = true
  try {
    const { data } = await api.post('/business/collect-all')
    if (data?.money != null) store.mergePartial({ money: data.money })
    await refreshBiz()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Collect failed') }
  finally { bizBusy.value = false }
}

function startRename(b) {
  renamingId.value = b._id
  renameText.value = b.name
}

async function doRename(b) {
  if (!renameText.value.trim()) return
  bizBusy.value = true
  try {
    await api.post('/business/rename', { bizId: b._id, newName: renameText.value.trim() })
    renamingId.value = null
    await refreshBiz()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Rename failed') }
  finally { bizBusy.value = false }
}

onMounted(async () => {
  await ensurePlayer()
  await Promise.all([loadCatalog(), loadGrowData(), loadBizCatalog(), loadMyBiz()])
})

watch(() => store.player?.user, async (v, ov) => {
  if (v && v !== ov) {
    await Promise.all([loadCatalog(), loadGrowData(), loadBizCatalog(), loadMyBiz()])
  }
})
</script>

<style scoped>
.broker-toolbar { display: flex; justify-content: space-between; align-items: center; }
.toggle { font-size: 12px; color: var(--muted); }
.card--active-border { border-color: var(--accent); }
.card__media { width: 100%; aspect-ratio: 16/9; background: var(--bg-alt); }
.card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card__placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 12px; }
.count-badge { position: absolute; right: 6px; top: 6px; background: var(--panel); color: var(--text); padding: 1px 6px; border-radius: 2px; font-size: 11px; border: 1px solid var(--border); }
.card__body { padding: 10px; display: flex; flex-direction: column; gap: 6px; }
.card__row { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; }
.card__title { font-weight: 600; }
.card__meta { font-size: 12px; color: var(--muted); display: grid; gap: 1px; }
.card__upgrades { margin-top: 4px; }
.card__upgrades-title { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
.upgrade-list { display: grid; gap: 4px; margin-top: 4px; }
.upgrade { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.upgrade__name { font-size: 12px; }
.upgrade__spacer { flex: 1; }
.upgrade__price { font-size: 11px; color: var(--muted); }
.card__actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.status { font-size: 11px; color: var(--muted); }
.status--owned { color: var(--warn); }
.status--active { color: var(--ok); font-weight: 600; }
.wh-info { padding: 3px 0; }
.wh-name { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
.wh-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.wh-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.owned-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
.owned-card { border: 1px solid var(--border); border-radius: 2px; background: var(--panel); overflow: hidden; }
.owned-media { position: relative; width: 100%; aspect-ratio: 16/9; background: var(--bg-alt); }
.owned-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.owned-badge { position: absolute; right: 6px; top: 6px; background: var(--panel); color: var(--text); padding: 1px 6px; border-radius: 2px; font-size: 11px; border: 1px solid var(--border); }
.owned-body { padding: 6px; }
.owned-title { font-weight: 600; font-size: 12px; }
.owned-meta { font-size: 11px; color: var(--muted); }
.coming-soon { display: flex; gap: 14px; align-items: center; padding: 10px 0; }
.coming-soon__icon { font-size: 36px; }
.coming-soon__text p { margin-top: 4px; font-size: 12px; color: var(--muted); }

/* ── Business styles ── */
.biz-banner { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1px solid var(--border); border-radius: 2px; background: var(--panel); }
.biz-banner__left { display: flex; gap: 8px; align-items: center; font-size: 12px; }
.biz-banner__label { color: var(--muted); }
.biz-banner__value { font-weight: 700; }
.biz-banner__sep { color: var(--border); }

.biz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 10px; }
.biz-card { border: 1px solid var(--border); border-radius: 2px; background: var(--panel); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.biz-card--shutdown { border-color: var(--danger); opacity: 0.85; }

.biz-card__header { display: flex; align-items: center; gap: 10px; }
.biz-card__icon { font-size: 24px; }
.biz-card__title-group { flex: 1; }
.biz-card__name { font-weight: 700; font-size: 14px; }
.biz-card__type { font-size: 11px; color: var(--muted); }
.biz-card__tier { font-size: 11px; font-weight: 700; color: var(--accent); border: 1px solid var(--accent); padding: 1px 6px; border-radius: 2px; white-space: nowrap; }

.biz-card__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 12px; }
.biz-stat { display: flex; flex-direction: column; font-size: 11px; }
.biz-stat__label { color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; font-size: 10px; }
.biz-stat__value { font-weight: 600; font-size: 12px; }

.biz-card__actions { display: flex; flex-wrap: wrap; gap: 4px; }

.biz-rename { display: flex; gap: 6px; align-items: center; }
.biz-rename__input { flex: 1; padding: 4px 8px; border: 1px solid var(--border); border-radius: 2px; background: var(--bg-alt); color: var(--text); font-size: 12px; font-family: inherit; }

.btn--danger { background: var(--danger); color: #fff; border-color: var(--danger); }
.btn--danger:hover { opacity: 0.85; }

.tag--ok { color: var(--ok); font-weight: 700; }
.tag--danger { color: var(--danger); font-weight: 700; }

.biz-filter { display: flex; gap: 0; border-bottom: 1px solid var(--border); }

.biz-catalog { display: grid; gap: 8px; }
.biz-cat-card { display: flex; gap: 12px; align-items: center; padding: 10px 14px; border: 1px solid var(--border); border-radius: 2px; background: var(--panel); }
.biz-cat-card__icon { font-size: 28px; }
.biz-cat-card__body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.biz-cat-card__row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.biz-cat-card__meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; color: var(--muted); margin-top: 2px; }

.pill--legit { background: var(--ok); color: #fff; border-color: var(--ok); font-size: 10px; }
.pill--vice { background: var(--danger); color: #fff; border-color: var(--danger); font-size: 10px; }
</style>
