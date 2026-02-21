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
import api from '../../api/client'
import { usePlayer } from '../../composables/usePlayer'
import { useToast } from '../../composables/useToast'
import { fmtInt as fmt } from '../../utils/format'

const { store, ensurePlayer } = usePlayer()
const toast = useToast()
const busy = ref(false)
const last = ref(null)
const locations = ref([])
const selLoc = ref('')

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
    const { data } = await api.post('/crime/search-for-cash', { locationId: selLoc.value })
    last.value = data
    store.mergePartial({ money: data.money })
    if (store.player.nerveStats) store.player.nerveStats.nerve = data.nerve
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed')
  } finally { busy.value = false }
}

onMounted(async () => { await ensurePlayer(); await loadLocations() })
</script>

<style scoped>
.crime-sfc { max-width: 800px; margin: 16px auto; padding: 0 16px; }
.row { display: flex; gap: 12px; margin: 6px 0; color: var(--muted); }
.stat { font-size: 11px; }
.locations { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin: 10px 0; }
.loc { background: var(--bg-alt); color: var(--text); border: 1px solid var(--border); border-radius: 2px; padding: 8px; text-align: left; cursor: pointer; transition: border-color 80ms; font-size: 12px; }
.loc:hover { border-color: var(--accent); }
.loc.active { border-color: var(--accent); background: var(--accent-muted); }
.loc__name { font-weight: 600; margin-bottom: 4px; }
.pop { background: var(--bar-track); border: 1px solid var(--border); border-radius: 2px; height: 6px; overflow: hidden; }
.pop__bar { background: var(--accent); height: 100%; width: 0%; transition: width 0.2s ease; }
.result { margin-top: 8px; font-size: 13px; }
</style>
