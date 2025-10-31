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
                  <label><input type="radio" value="strength" v-model="stat" /> Strength</label>
                  <label><input type="radio" value="speed" v-model="stat" /> Speed</label>
                  <label><input type="radio" value="dexterity" v-model="stat" /> Dexterity</label>
                  <label><input type="radio" value="defense" v-model="stat" /> Defense</label>
                </div>
              </label>

              <label class="block">
                <span class="lbl">Energy per train</span>
                <input type="number" v-model.number="energyPerTrain" :max="energy" min="1" />
              </label>

              <div class="u-flex u-gap-16 u-wrap gym__meta">
                <div>
                  <div class="lbl">Gym</div>
                  <div class="gym__badge">{{ selectedGym?.name }}</div>
                </div>
                <div>
                  <div class="lbl">Benefits</div>
                  <div class="gym__badge">{{ selectedGym?.dots }}x dots, {{ selectedGym?.perk }}% perk</div>
                </div>
              </div>

              <div class="gym__gain">
                <button class="btn" @click="calcGain" :disabled="busy">Calculate</button>
                <span class="muted" v-if="gain==null">Expected gain: —</span>
                <span v-else>Expected gain: <strong>{{ fmtInt(gain) }}</strong></span>
              </div>

              <div class="gym__actions">
                <button class="btn" @click="train" :disabled="busy || energyPerTrain<1 || energyPerTrain>energy">{{ busy? 'Training…' : 'Train' }}</button>
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
      <h3>New gyms</h3>
      <div class="gyms__grid">
        <div
          v-for="g in gyms"
          :key="g.id"
          class="gym-card"
          :class="{ selected: g.id === selectedGymId, locked: g.locked }"
          @click="selectGym(g.id)"
          :aria-disabled="g.locked ? 'true' : 'false'"
        >
          <div class="gym-card__name">{{ g.name }}</div>
          <div class="gym-card__soon muted">{{ g.dots }}x dots • {{ g.perk }}% perk</div>
          <div v-if="g.locked" class="gym-card__lock">🔒 Locked</div>
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
const energyPerTrain = ref(10)
// Gyms catalog (placeholder values). Dots/Perk are tied to selected gym.
const gyms = ref([
  { id: 1,  name: 'Gym 1',  dots: 1, perk: 0,  locked: false },
  { id: 2,  name: 'Gym 2',  dots: 1, perk: 2,  locked: true },
  { id: 3,  name: 'Gym 3',  dots: 2, perk: 0,  locked: true },
  { id: 4,  name: 'Gym 4',  dots: 2, perk: 3,  locked: true },
  { id: 5,  name: 'Gym 5',  dots: 3, perk: 0,  locked: true },
  { id: 6,  name: 'Gym 6',  dots: 3, perk: 3,  locked: true },
  { id: 7,  name: 'Gym 7',  dots: 3, perk: 6,  locked: true },
  { id: 8,  name: 'Gym 8',  dots: 4, perk: 0,  locked: true },
  { id: 9,  name: 'Gym 9',  dots: 4, perk: 4,  locked: true },
  { id: 10, name: 'Gym 10', dots: 4, perk: 8,  locked: true },
  { id: 11, name: 'Gym 11', dots: 5, perk: 0,  locked: true },
  { id: 12, name: 'Gym 12', dots: 5, perk: 5,  locked: true },
  { id: 13, name: 'Gym 13', dots: 5, perk: 10, locked: true },
  { id: 14, name: 'Gym 14', dots: 5, perk: 15, locked: true },
  { id: 15, name: 'Gym 15', dots: 5, perk: 20, locked: true },
  { id: 16, name: 'Gym 16', dots: 5, perk: 25, locked: true },
])
const selectedGymId = ref(Number(localStorage.getItem('nc_selected_gym') || '1'))
const selectedGym = computed(() => {
  const g = gyms.value.find(g => g.id === selectedGymId.value)
  return g && !g.locked ? g : gyms.value[0]
})
function selectGym(id){
  const g = gyms.value.find(x => x.id === id)
  if (g?.locked) return
  selectedGymId.value = id
  try { localStorage.setItem('nc_selected_gym', String(id)) } catch {}
}
const gain = ref(null)

const stats = computed(() => store.player?.battleStats || { strength:0, speed:0, dexterity:0, defense:0 })
const energy = computed(() => store.player?.energyStats?.energy ?? 0)
const energyMax = computed(() => store.player?.energyStats?.energyMax ?? 0)
const happy = computed(() => store.player?.happiness?.happy ?? 0)
const happyMax = computed(() => store.player?.happiness?.happyMax ?? 0)

function fmtInt(n){ return Number(n||0).toLocaleString(undefined, { maximumFractionDigits: 0 }) }
function fmtStat(n){ return Number(n||0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

async function load(){
  loading.value = true
  try {
    try { user.value = JSON.parse(localStorage.getItem('nc_user')||'null') } catch {}
    if (!user.value?._id) throw new Error('Not logged in')
  await store.loadByUser(user.value._id)
  } catch(e){
    error.value = e?.response?.data?.error || e?.message || 'Failed to load player'
  } finally { loading.value = false }
}

async function calcGain(){
  error.value = ''; okMsg.value = ''; gain.value = null
  try {
    const body = {
      statTotal: stats.value[stat.value] || 0,
      happy: Number(happy.value)||0,
      gymDots: Number(selectedGym.value?.dots)||1,
      energyPerTrain: Number(energyPerTrain.value)||1,
      perkBonus: Number(selectedGym.value?.perk)||0,
      statType: stat.value,
      randomValue: 0
    }
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
    const body = {
      userId: user.value?._id,
      happy: Number(happy.value)||0,
      gymDots: Number(selectedGym.value?.dots)||1,
      energyPerTrain: Number(energyPerTrain.value)||1,
      perkBonus: Number(selectedGym.value?.perk)||0,
      statType: stat.value,
      randomValue: 0
    }
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
