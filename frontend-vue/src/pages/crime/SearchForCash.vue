<template>
  <section class="crime-sfc">
    <h2>Search for Cash</h2>

    <div class="card">
      <div class="row">
        <div class="stat">Money: ${{ fmt(store.player?.money) }}</div>
        <div class="stat">Nerve: {{ store.player?.nerveStats?.nerve ?? 0 }}</div>
      </div>
      <div class="muted">Choose a location below and try your luck.</div>

      <div class="locations">
        <button
          v-for="l in locations"
          :key="l.id"
          class="loc"
          :class="{ active: l.id===selLoc }"
          @click="selLoc = l.id">
          <div class="loc__name">{{ l.name }}</div>
          <div class="pop">
            <div class="pop__bar" :style="{ width: (Math.round((l.popularity||0)*100)) + '%' }"></div>
          </div>
        </button>
      </div>

      <button
        :disabled="busy || !store.player?.user || (store.player?.nerveStats?.nerve ?? 0) < 1 || !selLoc"
        @click="act()">
        Search
      </button>

      <div v-if="last" class="result">
        <div v-if="last.error" class="error">{{ last.error }}</div>
        <template v-else>
          <div>Outcome: <strong>{{ last.outcome }}</strong></div>
          <div v-if="last.awarded?.money">Found ${{ fmt(last.awarded.money) }}</div>
          <div v-if="last.awarded?.items?.length">Found items: {{ last.awarded.items.join(', ') }}</div>
          <div v-if="last.outcome!=='success' && !last.awarded?.items?.length && !last.awarded?.money">No loot.</div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../../stores/player'
import api from '../../api/client'

const store = usePlayerStore()
const router = useRouter()
const busy = ref(false)
const last = ref(null)
const locations = ref([])
const selLoc = ref('')

function fmt(n){ return Number(n||0).toLocaleString() }

async function ensurePlayer(){
  if (store.player?.user) return
  try {
    const cached = JSON.parse(localStorage.getItem('nc_player')||'null')
    if (cached?.user) { store.setPlayer(cached); return }
  } catch {}
  try {
    const u = JSON.parse(localStorage.getItem('nc_user')||'null')
    const uid = u?._id ?? u?.id
    if (uid) await store.loadByUser(uid)
  } catch {}
}

async function loadLocations(){
  try {
    const { data } = await api.get('/crime/locations')
    locations.value = data?.locations || []
    if (locations.value.length && !selLoc.value) selLoc.value = locations.value[0].id
  } catch { locations.value = [] }
}

async function act(){
  if (!store.player?.user) return
  busy.value = true
  try {
    const payload = { userId: store.player.user, locationId: selLoc.value }
    const { data } = await api.post('/crime/search-for-cash', payload)
    last.value = data
    await store.loadByUser(store.player.user)
  } catch (e) {
    const msg = e?.response?.data?.error || e?.message || 'Failed'
    last.value = { error: msg }
  } finally { busy.value = false }
}

onMounted(async () => { await ensurePlayer(); await loadLocations() })
</script>

<style scoped>
.crime-sfc { max-width: 800px; margin: 24px auto; padding: 0 16px; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; color: var(--text); }
.row { display:flex; gap: 16px; margin: 8px 0; color: var(--muted) }
.stat { font-size: 12px; }
.locations { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 12px 0; }
.loc { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 10px; text-align: left; }
.loc.active { outline: 2px solid var(--accent); }
.loc__name { font-weight: 600; margin-bottom: 6px; }
.pop { background: #222; border: 1px solid var(--border); border-radius: 6px; height: 8px; overflow: hidden; }
.pop__bar { background: var(--accent); height: 100%; width: 0%; transition: width .2s ease-in-out; }
.result { margin-top: 10px; font-size: 14px; }
.error { color: #ff5f73; }
button { padding: 8px 12px; background: var(--accent); color: #fff; border: 1px solid transparent; border-radius: 8px; cursor:pointer }
button:disabled { opacity: .6; cursor: not-allowed }
</style>
