<template>
  <section class="market">
    <h2>Marketplace</h2>
    <p class="muted">Buy and sell items, pets, and properties with other players.</p>

    <div class="tabs u-mb-8">
      <button :class="{ active: tab==='items' }" @click="switchTab('items')">Items</button>
      <button :class="{ active: tab==='pets' }" @click="switchTab('pets')">Pets</button>
      <button :class="{ active: tab==='properties' }" @click="switchTab('properties')">Properties</button>
    </div>

    <div class="grid">
      <div class="panel">
        <div class="panel__head">
          <h3>My Listings</h3>
          <button class="btn" @click="loadListings" :disabled="loading">Refresh</button>
        </div>
        <div v-if="loading" class="muted">Loading…</div>
        <div v-else>
          <table class="tbl" v-if="tab==='items'">
            <thead><tr><th>Item</th><th class="num">Price</th><th class="num">Available</th><th></th></tr></thead>
            <tbody>
              <tr v-for="l in myListings" :key="l.id">
                <td>{{ l.item?.name || l.itemId }}</td>
                <td class="num">{{ fmtMoney(l.price) }}</td>
                <td class="num">{{ l.amountAvailable }}</td>
                <td class="num"><button class="btn btn-danger" @click="cancel(l)" :disabled="busy">Cancel</button></td>
              </tr>
              <tr v-if="!myListings.length"><td colspan="4" class="muted">No listings</td></tr>
            </tbody>
          </table>
          <table class="tbl" v-else-if="tab==='pets'">
            <thead><tr><th>Pet</th><th class="num">Price</th><th></th></tr></thead>
            <tbody>
              <tr v-for="l in myListings" :key="l.id">
                <td>{{ l.pet?.name }} <span class="muted">({{ l.pet?.type }})</span></td>
                <td class="num">{{ fmtMoney(l.price) }}</td>
                <td class="num"><button class="btn btn-danger" @click="cancel(l)" :disabled="busy">Cancel</button></td>
              </tr>
              <tr v-if="!myListings.length"><td colspan="3" class="muted">No listings</td></tr>
            </tbody>
          </table>
          <table class="tbl" v-else>
            <thead><tr><th>Property</th><th class="num">Price</th><th></th></tr></thead>
            <tbody>
              <tr v-for="l in myListings" :key="l.id">
                <td>{{ l.property?.name || l.propertyId }}</td>
                <td class="num">{{ fmtMoney(l.price) }}</td>
                <td class="num"><button class="btn btn-danger" @click="cancel(l)" :disabled="busy">Cancel</button></td>
              </tr>
              <tr v-if="!myListings.length"><td colspan="3" class="muted">No listings</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3>Create Listing</h3>
        <div class="form-grid" v-if="tab==='items'">
          <label>Item</label>
          <select v-model="form.itemKey">
            <option disabled value="">Select item</option>
            <option v-for="it in inv" :key="it.item.id" :value="it.item.id">{{ it.item.name }} (x{{ it.qty }})</option>
          </select>

          <label>Quantity</label>
          <input v-model.number="form.qty" type="number" min="1" />

          <label>Unit Price</label>
          <input v-model.number="form.price" type="number" min="1" />
        </div>
        <div class="form-grid" v-else-if="tab==='pets'">
          <label>Your Pet</label>
          <div>
            <template v-if="petMine && petMine.pet">
              <strong>{{ petMine.pet.name }}</strong> <span class="muted">({{ petMine.pet.type }})</span>
              <div class="muted">Bonus: +{{ petMine.pet.happyBonus }} happiness</div>
            </template>
            <span v-else class="muted">No pet available</span>
          </div>
          <label>Price</label>
          <input v-model.number="form.petPrice" type="number" min="1" />
        </div>
        <div class="form-grid" v-else>
          <label>Property</label>
          <select v-model="form.propertyId">
            <option disabled value="">Select property</option>
            <option v-for="opt in propertyOptions" :key="opt.id" :value="opt.id">{{ opt.name }} <span v-if="opt.count>1">(x{{ opt.count }})</span></option>
          </select>
          <label>Price</label>
          <input v-model.number="form.propertyPrice" type="number" min="1" />
        </div>
        <div class="actions">
          <button class="btn" @click="create" :disabled="busy || !canCreate">List</button>
          <span class="muted" v-if="!canCreate">Fill all fields</span>
        </div>
      </div>

      <div class="panel panel--full">
        <div class="panel__head">
          <h3>All Listings</h3>
          <button class="btn" @click="loadListings" :disabled="loading">Refresh</button>
        </div>
        <div class="filter">
          <input v-model="filter" class="input" type="text" :placeholder="tab==='items' ? 'Search item name…' : (tab==='pets' ? 'Search pet name…' : 'Search property…')" />
        </div>
        <div v-if="loading" class="muted">Loading…</div>
        <div v-else>
          <table class="tbl" v-if="tab==='items'">
            <thead><tr><th>Item</th><th>Seller</th><th class="num">Price</th><th class="num">Available</th><th></th></tr></thead>
            <tbody>
              <tr v-for="l in filteredListings" :key="l.id">
                <td>{{ l.item?.name || l.itemId }}</td>
                <td>
                  <RouterLink v-if="l.seller?.playerId" :to="`/profile/${l.seller.playerId}`">{{ l.seller?.name }}</RouterLink>
                  <span v-else>{{ l.seller?.name || '—' }}</span>
                </td>
                <td class="num">{{ fmtMoney(l.price) }}</td>
                <td class="num">{{ l.amountAvailable }}</td>
                <td class="num">
                  <input v-model.number="l.buyQty" type="number" min="1" :max="l.amountAvailable" class="input input--qty" />
                  <button class="btn" @click="buy(l)" :disabled="busy || l.amountAvailable<=0">Buy</button>
                </td>
              </tr>
              <tr v-if="!listings.length"><td colspan="5" class="muted">No listings</td></tr>
            </tbody>
          </table>
          <table class="tbl" v-else-if="tab==='pets'">
            <thead><tr><th>Pet</th><th>Seller</th><th class="num">Price</th><th></th></tr></thead>
            <tbody>
              <tr v-for="l in filteredListings" :key="l.id">
                <td>{{ l.pet?.name }} <span class="muted">({{ l.pet?.type }})</span></td>
                <td>
                  <RouterLink v-if="l.seller?.playerId" :to="`/profile/${l.seller.playerId}`">{{ l.seller?.name }}</RouterLink>
                  <span v-else>{{ l.seller?.name || '—' }}</span>
                </td>
                <td class="num">{{ fmtMoney(l.price) }}</td>
                <td class="num">
                  <button class="btn" @click="buy(l)">Buy</button>
                </td>
              </tr>
              <tr v-if="!listings.length"><td colspan="4" class="muted">No listings</td></tr>
            </tbody>
          </table>
          <table class="tbl" v-else>
            <thead><tr><th>Property</th><th>Seller</th><th class="num">Price</th><th></th></tr></thead>
            <tbody>
              <tr v-for="l in filteredListings" :key="l.id">
                <td>{{ l.property?.name || l.propertyId }}</td>
                <td>
                  <RouterLink v-if="l.seller?.playerId" :to="`/profile/${l.seller.playerId}`">{{ l.seller?.name }}</RouterLink>
                  <span v-else>{{ l.seller?.name || '—' }}</span>
                </td>
                <td class="num">{{ fmtMoney(l.price) }}</td>
                <td class="num">
                  <button class="btn" @click="buy(l)">Buy</button>
                </td>
              </tr>
              <tr v-if="!listings.length"><td colspan="4" class="muted">No listings</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api/client'
import { usePlayerStore } from '../stores/player'

const store = usePlayerStore()
const loading = ref(false)
const busy = ref(false)
const inv = ref([])
const listings = ref([])
const tab = ref('items')
const petMine = ref(null)
const filter = ref('')

const form = ref({ itemKey: '', qty: 1, price: 1, petPrice: 1, propertyId: '', propertyPrice: 1 })
const canCreate = computed(() => {
  if (tab.value === 'items') return form.value.itemKey && form.value.qty > 0 && form.value.price > 0
  if (tab.value === 'pets') return Number(form.value.petPrice||0) > 0 && !!(petMine.value && petMine.value.pet)
  return form.value.propertyId && Number(form.value.propertyPrice||0) > 0
})

const myListings = computed(() => {
  const pid = store.player?._id
  return listings.value.filter(l => l.sellerId === pid)
})

function fmtMoney(n){ return `$${Number(n||0).toLocaleString(undefined,{ maximumFractionDigits: 0 })}` }

function getUserId(){ try { const u=JSON.parse(localStorage.getItem('nc_user')||'null'); return u?._id || u?.id || null } catch { return null } }

async function loadInventory(){
  if (!store.player?.user) return
  const { data } = await api.get(`/inventory/${store.player.user}`)
  // inventory entries are populated with 'inventory.item' in API
  inv.value = (data?.inventory||[]).map(e => ({ item: { id: e.item.id, name: e.item.name }, qty: e.qty }))
}

async function loadListings(){
  loading.value = true
  try {
    let data
    if (tab.value === 'items') {
      data = (await api.get('/market/listings')).data
      const rows = data?.listings || []
      rows.forEach(r => { r.buyQty = 1 })
      listings.value = rows
    } else if (tab.value === 'pets') {
      data = (await api.get('/market/listings/pets')).data
      listings.value = data?.listings || []
    } else {
      data = (await api.get('/market/listings/properties')).data
      listings.value = data?.listings || []
    }
  } catch (e){
    // ignore
  } finally { loading.value = false }
}

const filteredListings = computed(() => {
  const f = (filter.value||'').trim().toLowerCase()
  if (!f) return listings.value
  if (tab.value === 'items') return listings.value.filter(l => (l.item?.name||l.itemId||'').toLowerCase().includes(f))
  if (tab.value === 'pets') return listings.value.filter(l => (l.pet?.name||'').toLowerCase().includes(f))
  return listings.value.filter(l => (l.property?.name||l.propertyId||'').toLowerCase().includes(f))
})

async function ensurePlayer(){
  if (store.player?.user) return
  try {
    const raw = localStorage.getItem('nc_user')
    if (raw){ let u = raw; try { const o=JSON.parse(raw); u = o?._id || o?.id || raw } catch {}
      await store.loadByUser(u) }
  } catch {}
}

async function create(){
  if (!canCreate.value) return
  busy.value = true
  try {
    const uid = getUserId(); if (!uid) throw new Error('Not authenticated')
    if (tab.value === 'items') {
      await api.post('/market/list', { userId: uid, itemId: form.value.itemKey, qty: form.value.qty, price: form.value.price })
      form.value.qty = 1
    } else if (tab.value === 'pets') {
      await api.post('/market/list/pet', { userId: uid, price: form.value.petPrice })
    } else {
      await api.post('/market/list/property', { userId: uid, propertyId: form.value.propertyId, price: form.value.propertyPrice })
    }
    await Promise.all([loadListings(), loadInventory(), store.loadByUser(store.player.user), loadMinePet()])
  } catch (e){
    alert(e?.response?.data?.error || e?.message || 'Failed to list')
  } finally { busy.value = false }
}

async function cancel(l){
  busy.value = true
  try {
    const uid = getUserId(); if (!uid) throw new Error('Not authenticated')
    if (tab.value === 'items') await api.post('/market/cancel', { userId: uid, listingId: l.id })
    else if (tab.value === 'pets') await api.post('/market/cancel/pet', { userId: uid, listingId: l.id })
    else await api.post('/market/cancel/property', { userId: uid, listingId: l.id })
    await Promise.all([loadListings(), loadInventory(), store.loadByUser(store.player.user), loadMinePet()])
  } catch (e){ alert(e?.response?.data?.error || e?.message || 'Failed to cancel') }
  finally { busy.value = false }
}

async function buy(l){
  busy.value = true
  try {
    const uid = getUserId(); if (!uid) throw new Error('Not authenticated')
    if (tab.value === 'items') {
      const q = Math.max(1, Number(l.buyQty||1))
      await api.post('/market/buy', { userId: uid, listingId: l.id, qty: q })
    } else if (tab.value === 'pets') {
      await api.post('/market/buy/pet', { userId: uid, listingId: l.id })
    } else {
      await api.post('/market/buy/property', { userId: uid, listingId: l.id })
    }
    await Promise.all([loadListings(), store.loadByUser(store.player.user), loadMinePet()])
  } catch (e){ alert(e?.response?.data?.error || e?.message || 'Failed to buy') }
  finally { busy.value = false }
}

function switchTab(next){ tab.value = next; loadListings() }

async function loadMinePet(){
  try {
    if (!store.player?.user) return
    const { data } = await api.get('/pets/my', { params: { userId: store.player.user } })
    petMine.value = data
  } catch { petMine.value = null }
}

const propertyOptions = computed(() => {
  const opts = []
  const defs = new Map((store.player?.properties||[]).map(e => [e.propertyId, e]))
  // Build from catalog to get names
  // Fallback to ID if not found in catalog
  const seen = {}
  const props = store.player?.properties || []
  for (const e of props) {
    if (e.propertyId === 'trailer') continue
    if (store.player?.home === e.propertyId) continue
    seen[e.propertyId] = (seen[e.propertyId]||0) + 1
  }
  for (const id of Object.keys(seen)) {
    const name = id.replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase())
    opts.push({ id, name, count: seen[id] })
  }
  // Ensure 'silo' shows up if owned
  return opts.sort((a,b)=> a.name.localeCompare(b.name))
})

onMounted(async () => { await ensurePlayer(); await Promise.all([loadInventory(), loadListings(), loadMinePet()]) })
</script>

<style scoped>
.grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.panel { border: 1px solid var(--border, #2b2f38); border-radius: 8px; padding: 10px; background: var(--panel, #171a2b); }
.panel--full { grid-column: 1 / -1; }
.panel__head { display:flex; align-items:center; justify-content: space-between; }
.tbl { width:100%; border-collapse: collapse; font-size: 13px; }
.tbl th, .tbl td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.08); white-space: nowrap; }
.tbl td.num { text-align: right; font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }
.actions { margin-top: 8px; display:flex; gap: 8px; align-items: center; }
.form-grid { display:grid; grid-template-columns: 120px 1fr; gap: 8px; align-items:center; }
.input, select { padding: 6px 8px; border-radius: 8px; border: 1px solid var(--border, rgba(255,255,255,0.18)); background:#0f1421; color: var(--text, #e8eaf6); }
.input--qty { width: 72px; }
.btn { border: 1px solid var(--border, #2b2f38); background: rgba(255,255,255,0.06); padding: 6px 10px; border-radius: 8px; cursor: pointer; color: var(--text, #e8eaf6); }
.btn-danger { background:#c92a2a; border-color:#a61e1e; }
.tabs { display:flex; gap: 6px; }
.tabs button { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border, #2b2f38); background: rgba(255,255,255,0.06); color: var(--text, #e8eaf6); cursor: pointer; }
.tabs button.active { background:#2563eb; color:#fff; border-color:#1d4ed8; }
</style>
