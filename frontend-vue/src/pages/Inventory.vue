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
        <div class="cooldown" v-if="cooldownHours(entry.item) !== null">
          Cooldown: <strong>{{ cooldownHours(entry.item) }}h</strong>
        </div>
        <div class="card__actions">
          <button
            class="btn btn--primary"
            :disabled="!entry.item.usable || busy"
            @click="useOne(entry)"
          >Use</button>
          <button class="btn btn--secondary" :disabled="true">Send (soon)</button>
          <button class="btn" :disabled="true">Trash (soon)</button>

        </div>
      </div>
      <div v-if="filtered.length === 0" class="empty muted">No items here</div>
    </div>
  </section>
  
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../api/client'
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'

const { store, ensurePlayer, reloadPlayer } = usePlayer()
const toast = useToast()

const inv = ref([])
const loading = ref(false)
const busy = ref(false)
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
  try {
    const { data } = await api.get('/inventory/mine')
    inv.value = data?.inventory || []
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to load inventory')
  } finally { loading.value = false }
}

async function useOne(entry){
  if (!store.player?.user) return
  busy.value = true
  try {
    const itemId = entry?.item?._id || entry?.item?.id
    await api.post('/inventory/use', { itemId, qty: 1 })
    await loadInventory()
    await reloadPlayer()
    toast.ok('Item used.')
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to use item')
  } finally { busy.value = false }
}

onMounted(async () => { await ensurePlayer(); await loadInventory() })
watch(() => store.player?.user, async (v, ov) => { if (v && v !== ov) await loadInventory() })

function cooldownHours(item){
  const sec = Number(item?.effect?.cooldownSeconds || 0)
  if (!Number.isFinite(sec) || sec <= 0) return null
  const hours = sec / 3600
  if (hours >= 10) return Math.round(hours)
  return Math.round(hours * 10) / 10
}

</script>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 10px; }
.spacer { flex: 1; }
.search { border: 1px solid var(--border); background: var(--input-bg); padding: 5px 8px; border-radius: 2px; min-width: 160px; font-size: 12px; color: var(--text); }
.count { margin-left: 4px; opacity: 0.7; font-size: 10px; }
.card__head { display: flex; justify-content: space-between; align-items: baseline; }
.item-name { font-weight: 600; font-size: 12px; }
.qty { font-size: 12px; opacity: 0.8; }
.item-type { font-size: 11px; color: var(--muted); }
.desc { font-size: 12px; }
.cooldown { font-size: 11px; color: var(--warn); }
.card__actions { display: flex; gap: 6px; margin-top: 4px; }
</style>
