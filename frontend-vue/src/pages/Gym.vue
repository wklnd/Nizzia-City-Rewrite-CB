<template>
  <section>
    <h2>Gym</h2>
    <div class="panel u-mt-8">
      <div class="gym__grid">
        <div>
          <h3>Train</h3>
          <div class="muted" v-if="loading">Loading…</div>
          <div v-else>
            <div class="gym__stats">
              <div>
                <div class="muted">Energy</div>
                <div><strong>{{ energy }}</strong> / {{ energyMax }}</div>
              </div>
              <div>
                <div class="muted">Happiness</div>
                <div><strong>{{ happy }}</strong> / {{ happyMax }}</div>
              </div>
            </div>

            <div class="gym__controls">
              <label class="block">
                <span class="lbl">Stat</span>
                <div class="radio-row">
                  <label><input type="radio" value="strength" v-model="stat" :disabled="!supports('strength')" /> Strength</label>
                  <label><input type="radio" value="speed" v-model="stat" :disabled="!supports('speed')" /> Speed</label>
                  <label><input type="radio" value="dexterity" v-model="stat" :disabled="!supports('dexterity')" /> Dexterity</label>
                  <label><input type="radio" value="defense" v-model="stat" :disabled="!supports('defense')" /> Defense</label>
                </div>
              </label>

              <label class="block">
                <span class="lbl">Energy per train</span>
                <div class="u-flex u-gap-8 u-align-center">
                  <input type="number" v-model.number="energyPerTrain" :max="energy" min="1" />
                  <button type="button" class="btn btn--small" @click="useAllEnergy">Use all</button>
                </div>
              </label>

              <div class="u-flex u-gap-16 u-wrap gym__meta">
                <div>
                  <div class="lbl">Gym</div>
                  <div class="gym__badge">{{ selectedGym?.name }}</div>
                </div>
                <div>
                  <div class="lbl">Energy (info)</div>
                  <div class="gym__badge">E/train: {{ selectedGym?.energyPerTrain ?? '-' }}</div>
                </div>
              </div>

              <div class="gym__gain">
                <button class="btn" @click="calcGain" :disabled="busy">Calculate</button>
                <span class="muted" v-if="gain==null">Expected gain: —</span>
                <span v-else>Expected gain: <strong>{{ fmtInt(gain) }}</strong></span>
              </div>

              <div class="gym__actions">
                <button class="btn" @click="train" :disabled="busy || !canTrainStat || energyPerTrain<1 || energyPerTrain>energy">{{ busy? 'Training…' : 'Train' }}</button>
                <span class="msg" :class="{ err: !!error, ok: !!okMsg }">{{ error || okMsg }}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3>Battle stats</h3>
          <ul class="kv">
            <li><span class="k">Strength</span><span class="v">{{ fmtStat(stats.strength) }}</span></li>
            <li><span class="k">Speed</span><span class="v">{{ fmtStat(stats.speed) }}</span></li>
            <li><span class="k">Dexterity</span><span class="v">{{ fmtStat(stats.dexterity) }}</span></li>
            <li><span class="k">Defense</span><span class="v">{{ fmtStat(stats.defense) }}</span></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="panel u-mt-12">
      <h3>Gyms</h3>
      <div class="gyms__grid">
        <div
          v-for="g in gyms"
          :key="g.id"
          class="gym-card"
          :class="{ selected: g.id === selectedGymId, locked: g.locked }"
          @click="g.locked ? null : selectGym(g.id)"
          :aria-disabled="g.locked ? 'true' : 'false'"
        >
          <div class="gym-card__name">{{ g.name }}</div>
          <div class="gym-card__soon muted">E/train: {{ g.energyPerTrain }}</div>
          <div v-if="g.locked" class="gym-card__lock">
            🔒 Locked
            <template v-if="g.isNext">
              — Energy {{ fmtInt(g.energySpent) }} / {{ fmtInt(g.requiredEnergy || 0) }} • ${{ fmtInt(g.unlockCost) }}
            </template>
          </div>
          <button v-if="g.locked && g.isNext" class="btn btn--small u-mt-6" :disabled="!g.unlockable" @click.stop="unlock(g.id)">Unlock</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api/client'
import { usePlayerStore } from '../stores/player'

const loading = ref(true)
const busy = ref(false)
const error = ref('')
const okMsg = ref('')

const user = ref(null)
const store = usePlayerStore()

const stat = ref('strength')
const gyms = ref([])
const selectedGymId = ref(1)
const selectedGym = computed(() => gyms.value.find(g => g.id === selectedGymId.value))
const energyPerTrain = ref(5)
const canTrainStat = computed(() => {
  const g = selectedGym.value
  if (!g) return false
  const v = g.gains?.[stat.value]
  return typeof v === 'number' && v > 0
})
function supports(type){
  const g = selectedGym.value
  if (!g) return false
  const v = g.gains?.[type]
  return typeof v === 'number' && v > 0
}
async function selectGym(id){
  const g = gyms.value.find(x => x.id === id)
  if (!g || g.locked) return
  await api.post('/gym/select', { userId: user.value?._id, gymId: id })
  selectedGymId.value = id
}
async function unlock(id){
  error.value = ''; okMsg.value = ''
  try {
    const res = await api.post('/gym/unlock', { userId: user.value?._id, gymId: id })
    const data = res.data || res
    // Refresh catalog
    await loadCatalog()
    await store.loadByUser(user.value?._id)
    okMsg.value = 'Gym unlocked.'
  } catch(e){
    error.value = e?.response?.data?.error || e?.message || 'Failed to unlock'
  }
}
const gain = ref(null)

const stats = computed(() => store.player?.battleStats || { strength:0, speed:0, dexterity:0, defense:0 })
const energy = computed(() => store.player?.energyStats?.energy ?? 0)
const energyMax = computed(() => store.player?.energyStats?.energyMax ?? 0)
const happy = computed(() => store.player?.happiness?.happy ?? 0)
const happyMax = computed(() => store.player?.happiness?.happyMax ?? 0)

function fmtInt(n){ return Number(n||0).toLocaleString(undefined, { maximumFractionDigits: 0 }) }
function fmtStat(n){ return Number(n||0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

async function loadCatalog(){
  const res = await api.get('/gym/catalog', { params: { userId: user.value?._id } })
  const data = res.data || res
  gyms.value = data.gyms || []
  selectedGymId.value = data.selectedGymId || 1
}

async function load(){
  loading.value = true
  try {
    try { user.value = JSON.parse(localStorage.getItem('nc_user')||'null') } catch {}
    if (!user.value?._id) throw new Error('Not logged in')
    await store.loadByUser(user.value._id)
    await loadCatalog()
  } catch(e){
    error.value = e?.response?.data?.error || e?.message || 'Failed to load player'
  } finally { loading.value = false }
}

async function calcGain(){
  error.value = ''; okMsg.value = ''; gain.value = null
  try {
    const body = { userId: user.value?._id, statType: stat.value }
  body.energyPerTrain = Math.max(1, Math.floor(Number(energyPerTrain.value||1)))
    const res = await api.post('/gym/calculate', body)
    const data = res.data || res
    gain.value = Number(data.gain || 0)
  } catch(e){
    error.value = e?.response?.data?.error || e?.message || 'Failed to calculate'
  }
}

async function train(){
  error.value = ''; okMsg.value = ''
  busy.value = true
  try {
  const body = { userId: user.value?._id, statType: stat.value, energyPerTrain: Math.max(1, Math.floor(Number(energyPerTrain.value||1))) }
    const res = await api.post('/gym/train', body)
    const data = res.data || res
    // Patch local player state with response
    okMsg.value = 'Training complete.'
    // Reload from backend so Sidebar and others update via the store
    await store.loadByUser(user.value?._id)
    await calcGain()
  } catch(e){
    error.value = e?.response?.data?.error || e?.message || 'Training failed'
  } finally { busy.value = false }
}

onMounted(async () => { await load(); await calcGain() })

function useAllEnergy(){
  energyPerTrain.value = Math.max(1, Number(energy.value||0))
}
</script>

<style scoped>
.gym__grid { display:grid; grid-template-columns: 2fr 1fr; gap: 12px; }
.gym__stats { display:flex; gap: 16px; margin-bottom: 10px; }
.gym__controls { display:flex; flex-direction: column; gap: 10px; }
.radio-row { display:flex; gap: 12px; flex-wrap: wrap; }
.block { display:block; }
.lbl { display:block; font-size:12px; color: var(--muted); margin-bottom: 4px; }
input[type="number"], select { padding: 8px; border-radius: 6px; border: 1px solid #555; background: #2b2b2b; color: #fff; }
.gym__meta .gym__badge { display:inline-block; padding:6px 10px; border-radius:999px; border:1px solid var(--border); background: rgba(255,255,255,0.04); }
.gym__gain { display:flex; align-items:center; gap: 12px; }
.gym__actions { display:flex; align-items:center; gap: 12px; }
.msg { font-size: 12px; }
.msg.ok { color: #a3d977; }
.msg.err { color: #ff6b6b; }

.kv { list-style:none; padding:0; margin:6px 0 0 0; }
.kv li { display:flex; justify-content: space-between; padding: 4px 0; }
.kv .k { color: var(--muted); }
.kv .v { font-weight: 600; }

.gyms__grid { display:grid; grid-template-columns: repeat(8, 1fr); gap: 10px; }
.gym-card { position: relative; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 10px; display:flex; flex-direction:column; align-items:flex-start; gap:4px; cursor: pointer; transition: border-color 120ms ease, background 120ms ease, opacity 120ms ease; }
.gym-card.selected { border-color: #5ac8fa; background: rgba(90,200,250,0.08); }
.gym-card.locked { opacity: 0.5; cursor: not-allowed; }
.gym-card__name { font-weight: 600; }
.gym-card__soon { font-size: 12px; }
.gym-card__lock { position: absolute; top: 8px; right: 8px; font-size: 12px; }

@media (max-width: 1200px){
  .gyms__grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
  .gym__grid { grid-template-columns: 1fr; }
}
</style>
