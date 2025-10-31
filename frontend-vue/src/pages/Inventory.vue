<template>
  <section>
    <h2>Inventory</h2>
    <p class="muted">Your items, neatly organized by category.</p>

    <div class="toolbar u-mt-6">
      <div class="tabs">
        <button
          v-for="t in tabsWithCounts"
          :key="t.key"
          class="tab"
          :class="{ 'tab--active': activeTab === t.key }"
          @click="activeTab = t.key"
        >
          {{ t.label }}<span class="count" v-if="t.count !== undefined">{{ t.count }}</span>
        </button>
      </div>
      <div class="spacer"></div>
      <input class="search" type="search" v-model="q" placeholder="Search items" />
    </div>

    <div v-if="loading" class="muted u-mt-6">Loading inventory…</div>
    <div v-else class="grid u-mt-6">
      <div v-for="entry in filtered" :key="entry.item._id" class="card">
        <div class="card__head">
          <div class="item-name">{{ entry.item.name }}</div>
          <div class="qty">x{{ entry.qty }}</div>
        </div>
        <div class="item-type">{{ labelForType(entry.item.type) }}</div>
        <div class="desc" v-if="entry.item.description">{{ entry.item.description }}</div>
        <div class="card__actions">
          <button
            class="btn btn--primary"
            :disabled="!entry.item.usable || busy"
            @click="useOne(entry)"
          >Use</button>
          <button class="btn" disabled>Sell (soon)</button>
        </div>
      </div>
      <div v-if="!error && filtered.length === 0" class="empty muted">No items here</div>
    </div>

    <div v-if="error" class="error u-mt-6">{{ error }}</div>
  </section>
  
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../api/client'
import { usePlayerStore } from '../stores/player'

const store = usePlayerStore()

const inv = ref([])
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const q = ref('')
const activeTab = ref('all')

const TYPE_LABELS = {
  weapon: 'Weapons',
  armor: 'Armor',
  medicine: 'Medicine',
  alchool: 'Alcohol',
  enhancers: 'Enhancers',
  clothes: 'Clothes',
  tools: 'Tools',
  drugs: 'Drugs',
  collectibles: 'Collectibles',
}

function labelForType(t){ return TYPE_LABELS[t] || t }

function categoriesFromInventory(list){
  const map = new Map()
  for (const e of list) {
    const t = e?.item?.type
    if (!t) continue
    map.set(t, (map.get(t) || 0) + (Number(e.qty||0) > 0 ? 1 : 0))
  }
  const cats = Array.from(map.entries()).map(([key, count]) => ({ key, label: labelForType(key), count }))
  cats.sort((a,b)=> a.label.localeCompare(b.label))
  return cats
}

// Fixed tabs: always visible even if empty
const TABS = [
  { key: 'all', label: 'All', predicate: () => true },
  { key: 'weapons', label: 'Weapons', predicate: (e) => e?.item?.type === 'weapon' && e?.item?.type2 !== 'meleeWeapon' },
  { key: 'melee', label: 'Melee', predicate: (e) => e?.item?.type === 'weapon' && e?.item?.type2 === 'meleeWeapon' },
  { key: 'armor', label: 'Armor', predicate: (e) => e?.item?.type === 'armor' },
  { key: 'clothes', label: 'Clothing', predicate: (e) => e?.item?.type === 'clothes' },
  { key: 'drugs', label: 'Drugs', predicate: (e) => e?.item?.type === 'drugs' },
  { key: 'alchool', label: 'Alchool', predicate: (e) => e?.item?.type === 'alchool' },
  { key: 'enhancers', label: 'Boosters', predicate: (e) => e?.item?.type === 'enhancers' },
  { key: 'medicine', label: 'Medicine', predicate: (e) => e?.item?.type === 'medicine' },
  { key: 'tools', label: 'Tools', predicate: (e) => e?.item?.type === 'tools' },
  { key: 'collectibles', label: 'Collectibles', predicate: (e) => e?.item?.type === 'collectibles' },
  { key: 'caches', label: 'Caches', predicate: (e) => e?.item?.type === 'caches' },
]

const tabsWithCounts = computed(() => TABS.map(t => ({
  key: t.key,
  label: t.label,
  count: t.key === 'all' ? inv.value.length : inv.value.filter(e => t.predicate(e)).length,
})))

const filtered = computed(() => {
  let list = inv.value
  const tab = TABS.find(t => t.key === activeTab.value) || TABS[0]
  if (tab && tab.key !== 'all') list = list.filter(e => tab.predicate(e))
  const qq = q.value.trim().toLowerCase()
  if (qq) list = list.filter(e => (e?.item?.name || '').toLowerCase().includes(qq))
  return list
})

async function loadInventory(){
  if (!store.player?.user) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/inventory/${store.player.user}`)
    inv.value = data?.inventory || []
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to load inventory'
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
      try { const obj = JSON.parse(raw); uid = obj?._id || obj?.id || raw } catch {}
      await store.loadByUser(uid)
    }
  } catch {}
}

async function useOne(entry){
  if (!store.player?.user) return
  busy.value = true
  error.value = ''
  try {
    const itemId = entry?.item?._id || entry?.item?.id
    await api.post('/inventory/use', { userId: store.player.user, itemId, qty: 1 })
    // Refresh inventory and player (stats may change)
    await loadInventory()
    await store.loadByUser(store.player.user)
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to use item'
  } finally {
    busy.value = false
  }
}

onMounted(async () => { await ensurePlayer(); await loadInventory() })
watch(() => store.player?.user, async (v, ov) => { if (v && v !== ov) await loadInventory() })

</script>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 12px; }
.spacer { flex: 1; }
.tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.tab { padding: 6px 10px; border-radius: 999px; border: 1px solid var(--border, #2b2f38); background: rgba(255,255,255,0.03); cursor: pointer; }
.tab--active { background: #2563eb; color: white; border-color: #1d4ed8; }
.count { margin-left: 6px; opacity: 0.8; font-size: 0.85em; }
.search { border: 1px solid var(--border, #2b2f38); background: rgba(255,255,255,0.02); padding: 6px 10px; border-radius: 8px; min-width: 180px; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.card { border: 1px solid var(--border, #2b2f38); border-radius: 10px; background: rgba(255,255,255,0.02); padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.card__head { display: flex; justify-content: space-between; align-items: baseline; }
.item-name { font-weight: 600; }
.qty { color: var(--muted, #99a2b2); }
.item-type { font-size: 0.85rem; color: var(--muted, #99a2b2); }
.desc { font-size: 0.95rem; color: #c8d0e0; }
.card__actions { display: flex; gap: 8px; margin-top: 6px; }
.btn { border: 1px solid var(--border, #2b2f38); background: rgba(255,255,255,0.03); padding: 6px 10px; border-radius: 8px; cursor: pointer; }
.btn[disabled] { opacity: 0.5; cursor: not-allowed; }
.btn--primary { background: #2563eb; color: white; border-color: #1d4ed8; }

.error { color: #ff7b7b; }
.empty { grid-column: 1 / -1; padding: 12px; }
</style>
