<template>
  <section class="pets">
    <h2>Pet Store</h2>
    <p class="muted">Adopt a companion to boost your happiness. You can own one pet at a time.</p>

    <div class="panel" v-if="loading">Loading…</div>
    <div class="panel" v-else-if="error" style="color:var(--danger);">{{ error }}</div>

    <div v-else>
      <div class="grid">
        <div class="panel">
          <h3>Your Pet</h3>
          <div v-if="!mine?.pet" class="muted">No pet yet. Pick one below!</div>
          <div v-else class="pet-owned">
            <img class="pet-img" :src="petImage(mine.pet)" alt="Pet" @error="onImgErr($event)"/>
            <div class="pet-info">
              <div class="pet-title"><strong>{{ mine.pet.name }}</strong> <span class="muted">({{ mine.pet.type }})</span></div>
              <div class="pet-tags">
                <span class="pill">Happiness Bonus: +{{ mine.pet.happyBonus }}</span>
                <span class="pill">Age: {{ mine.pet.age }}d</span>
              </div>
              <div class="pet-actions">
                <input v-model="newName" type="text" class="input" placeholder="Nickname" :maxlength="32" />
                <button class="btn" @click="renamePet" :disabled="busy || !canRename">Save Name</button>
                <button class="btn btn-danger" @click="release" :disabled="busy">Release</button>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <h3>Catalog</h3>
          <div class="cards">
            <div class="card" v-for="p in catalog.pets" :key="p.id">
              <img class="card-img" :src="petImageById(p.id)" :alt="p.name" @error="onImgErr($event)" />
              <div class="card-head">
                <div class="card-title">{{ p.name }}</div>
                <div class="muted">+{{ p.happyBonus }} happy</div>
              </div>
              <div class="card-body">
                <div class="muted">Price: {{ fmtMoney(p.cost) }}</div>
              </div>
              <div class="card-actions">
                <button class="btn" @click="buy(p)" :disabled="busy || !!mine.pet">Buy</button>
              </div>
            </div>
            <div v-if="!catalog.pets?.length" class="muted">Nothing for sale.</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../api/client'
import { useToast } from '../composables/useToast'
import { fmtMoney } from '../utils/format'

const toast = useToast()

const loading = ref(true)
const error = ref('')
const busy = ref(false)
const mine = ref({ pet: null })
const catalog = ref({ pets: [] })
const newName = ref('')

function onImgErr(e){ e.target.style.background = '#2b2b2b'; e.target.src = '' }
function petImage(p){
  if (!p?.type) return '/assets/images/pet_placeholder.jpg'
  return `/assets/images/pet_${p.type}.jpg`
}
function petImageById(id){
  if (!id) return '/assets/images/pet_placeholder.jpg'
  return `/assets/images/pet_${id}.jpg`
}

async function load(){
  loading.value = true; error.value = ''
  try {
    const [mineRes, catRes] = await Promise.all([
      api.get('/pets/my'),
      api.get('/pets/catalog'),
    ])
    mine.value = mineRes.data || mineRes
    catalog.value = catRes.data || catRes
    newName.value = mine.value?.pet?.name || ''
  } catch (e){
    error.value = e?.response?.data?.error || e?.message || 'Failed to load'
  } finally { loading.value = false }
}

async function buy(p){
  busy.value = true
  try {
    await api.post('/pets/buy', { type: p.id, name: p.name })
    toast.ok(`Adopted ${p.name}!`)
    await load()
  } catch (e){
    toast.error(e?.response?.data?.error || e?.message || 'Failed to buy')
  } finally { busy.value = false }
}

async function release(){
  busy.value = true
  try {
    if (!confirm('Release your pet?')) { busy.value = false; return }
    await api.post('/pets/release')
    toast.ok('Pet released')
    await load()
  } catch (e){
    toast.error(e?.response?.data?.error || e?.message || 'Failed to release')
  } finally { busy.value = false }
}

const canRename = computed(() => {
  const n = (newName.value || '').trim();
  return n.length >= 2 && n.length <= 32;
})

async function renamePet(){
  if (!canRename.value) return
  busy.value = true
  try {
    await api.post('/pets/rename', { name: newName.value.trim() })
    toast.ok('Pet renamed')
    await load()
  } catch (e){
    toast.error(e?.response?.data?.error || e?.message || 'Failed to rename')
  } finally { busy.value = false }
}

onMounted(load)
</script>

<style scoped>
.pet-owned { display: flex; gap: 10px; align-items: center; }
.pet-img { width: 120px; height: 72px; object-fit: cover; border-radius: 2px; border: 1px solid var(--border); background: var(--bg-alt); }
.pet-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.pet-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.pet-actions { display: flex; gap: 6px; align-items: center; margin-top: 6px; }
.input { padding: 5px 8px; border-radius: 2px; border: 1px solid var(--border); background: var(--input-bg); color: var(--text); font-size: 12px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; }
.card-img { width: 100%; aspect-ratio: 5/3; object-fit: cover; border-radius: 2px; border: 1px solid var(--border); background: var(--bg-alt); margin-bottom: 6px; }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.card-title { font-weight: 700; font-size: 13px; }
.card-actions { margin-top: 6px; display: flex; justify-content: flex-end; }
.btn-danger { background: var(--danger); color: #fff; border-color: var(--danger); }
</style>
