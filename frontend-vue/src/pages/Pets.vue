<template>
  <section class="pets">
    <h2>Pet Store</h2>
    <p class="muted">Adopt a companion to boost your happiness. You can own one pet at a time.</p>

    <div class="panel" v-if="loading">Loading…</div>
    <div class="panel" v-else-if="error" style="color:#ff6b6b;">{{ error }}</div>

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

const loading = ref(true)
const error = ref('')
const busy = ref(false)
const mine = ref({ pet: null })
const catalog = ref({ pets: [] })
const newName = ref('')

function fmtMoney(n){ return `$${Number(n||0).toLocaleString(undefined,{ maximumFractionDigits: 0 })}` }
function onImgErr(e){ e.target.style.background = '#2b2b2b'; e.target.src = '' }
function petImage(p){
  if (!p?.type) return '/assets/images/pet_placeholder.jpg'
  // Convention: drop files under public/assets/images as pet_<type>.jpg (e.g., pet_dog.jpg)
  return `/assets/images/pet_${p.type}.jpg`
}
function petImageById(id){
  if (!id) return '/assets/images/pet_placeholder.jpg'
  return `/assets/images/pet_${id}.jpg`
}

function getUserId(){
  try { const u = JSON.parse(localStorage.getItem('nc_user')||'null'); return u?._id || u?.id || null } catch { return null }
}

async function load(){
  loading.value = true; error.value = ''
  try {
    const uid = getUserId()
    if (!uid) throw new Error('Not authenticated')
    const [mineRes, catRes] = await Promise.all([
      api.get(`/pets/my`, { params: { userId: uid } }),
      api.get(`/pets/catalog`),
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
    const uid = getUserId(); if (!uid) throw new Error('Not authenticated')
    await api.post('/pets/buy', { userId: uid, type: p.id, name: p.name })
    await load()
  } catch (e){
    alert(e?.response?.data?.error || e?.message || 'Failed to buy')
  } finally { busy.value = false }
}

async function release(){
  busy.value = true
  try {
    const uid = getUserId(); if (!uid) throw new Error('Not authenticated')
    if (!confirm('Release your pet?')) { busy.value = false; return }
    await api.post('/pets/release', { userId: uid })
    await load()
  } catch (e){
    alert(e?.response?.data?.error || e?.message || 'Failed to release')
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
    const uid = getUserId(); if (!uid) throw new Error('Not authenticated')
    await api.post('/pets/rename', { userId: uid, name: newName.value.trim() })
    await load()
  } catch (e){
    alert(e?.response?.data?.error || e?.message || 'Failed to rename')
  } finally { busy.value = false }
}

onMounted(load)
</script>

<style scoped>
.grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-top: 12px; }
.pet-owned { display:flex; gap: 12px; align-items: center; }
.pet-img { width: 140px; height: 84px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background:#2b2b2b; }
.pet-title { font-size: 16px; margin-bottom: 6px; }
.pet-tags { display:flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
.pill { display:inline-block; padding: 2px 8px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background:#1e2433; font-size: 12px; }
.pet-actions { display:flex; gap: 8px; align-items: center; margin-top: 8px; }
.input { padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.18); background:#0f1421; color: #e8eaf6; }
.cards { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
.card { border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 10px; background:#151a24; }
.card-img { width: 100%; aspect-ratio: 5/3; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); background:#2b2b2b; margin-bottom: 8px; }
.card-head { display:flex; align-items:center; justify-content: space-between; margin-bottom: 6px; }
.card-title { font-weight: 700; }
.card-actions { margin-top: 8px; display:flex; justify-content: flex-end; }
.btn-danger { background:#c92a2a; border-color:#a61e1e; }
</style>
