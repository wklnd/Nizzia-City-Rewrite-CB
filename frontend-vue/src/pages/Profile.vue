<template>
  <section class="profile">
    <h2>Profile</h2>
    <p class="muted" v-if="!player && !loading">No data.</p>

    <div v-if="loading" class="panel" style="margin-top:12px;">Loading…</div>
    <div v-else-if="error" class="panel" style="margin-top:12px;color:#ff6b6b;">{{ error }}</div>

    <div v-else>
      <div class="panel profile__head">
        <div>
          <div class="profile__title">
            <strong>{{ player.name }}</strong>
            <span class="muted">#{{ player.id }}</span>
          </div>
          <div class="muted">{{ player.playerTitle }} – {{ player.playerStatus }}</div>
        </div>
        <div class="profile__vitals">
          <div><span class="muted">HP</span> <strong>{{ vitals.health }}/100</strong></div>
          <div><span class="muted">Energy</span> <strong>{{ vitals.energy }}/{{ vitals.energyMax }}</strong></div>
          <div><span class="muted">Nerve</span> <strong>{{ vitals.nerve }}/{{ vitals.nerveMax }}</strong></div>
          <div><span class="muted">Happy</span> <strong>{{ vitals.happy }}/{{ vitals.happyMax }}</strong></div>
        </div>
      </div>

      <div class="profile__grid">
        <div class="panel">
          <h3>Finances</h3>
          <ul class="kv">
            <li><span class="k">Money</span><span class="v">{{ fmtMoney(fin.money) }}</span></li>
            <li><span class="k">Bank locked</span><span class="v">{{ fmtMoney(fin.bankLocked) }}</span></li>
            <li><span class="k">Portfolio</span><span class="v">{{ fmtMoney(fin.portfolioValue) }}</span></li>
            <li><span class="k">Net worth</span><span class="v">{{ fmtMoney(fin.netWorth) }}</span></li>
          </ul>
        </div>

        <div class="panel">
          <h3>Battle stats (total {{ fmtInt(battleTotal) }})</h3>
          <ul class="kv">
            <li><span class="k">Strength</span><span class="v">{{ fmtStat(player.battleStats.strength) }}</span></li>
            <li><span class="k">Speed</span><span class="v">{{ fmtStat(player.battleStats.speed) }}</span></li>
            <li><span class="k">Dexterity</span><span class="v">{{ fmtStat(player.battleStats.dexterity) }}</span></li>
            <li><span class="k">Defense</span><span class="v">{{ fmtStat(player.battleStats.defense) }}</span></li>
          </ul>
        </div>

        <div class="panel">
          <h3>Work stats (total {{ fmtInt(workTotal) }})</h3>
          <ul class="kv">
            <li><span class="k">Manual labor</span><span class="v">{{ fmtInt(player.workStats.manuallabor) }}</span></li>
            <li><span class="k">Intelligence</span><span class="v">{{ fmtInt(player.workStats.intelligence) }}</span></li>
            <li><span class="k">Endurance</span><span class="v">{{ fmtInt(player.workStats.endurance) }}</span></li>
            <li><span class="k">Employee efficiency</span><span class="v">{{ fmtInt(player.workStats.employeEfficiency) }}</span></li>
          </ul>
        </div>

        <div class="panel">
          <h3>Holdings</h3>
          <div class="table-wrap profile__holdings">
            <table class="tbl">
              <thead><tr><th>Symbol</th><th>Shares</th><th>Avg price</th><th>Value</th></tr></thead>
              <tbody>
                <tr v-for="h in player.finances.holdings" :key="h.symbol">
                  <td>{{ h.symbol }}</td>
                  <td class="num">{{ fmtInt(h.shares) }}</td>
                  <td class="num">{{ fmtMoney(h.avgPrice) }}</td>
                  <td class="num">{{ fmtMoney(h.value) }}</td>
                </tr>
                <tr v-if="!player.finances.holdings?.length"><td colspan="4" class="muted">No holdings</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel profile__panel--full">
          <div class="profile__head2">
            <h3>History</h3>
            <div class="tabs">
              <button :class="{ active: days===7 }" @click="setDays(7)">7d</button>
              <button :class="{ active: days===30 }" @click="setDays(30)">30d</button>
              <button :class="{ active: days===90 }" @click="setDays(90)">90d</button>
            </div>
          </div>
          <div class="sparkline__caption muted">Net worth — last {{ days }} days</div>
          <div class="sparkline">
            <svg :viewBox="`0 0 ${w} ${h}`" preserveAspectRatio="none">
              <polyline
                v-if="points.length"
                :points="svgPoints"
                fill="none"
                stroke="#5ac8fa"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
            </svg>
            <div class="muted" v-if="!points.length">No data</div>
          </div>
          <div class="sparkline__scale muted" v-if="points.length">
            <span>{{ fmtMoney(minVal) }}</span>
            <span>{{ fmtMoney(maxVal) }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api/client'

const route = useRoute()
const player = ref(null)
const loading = ref(true)
const error = ref('')

const days = ref(30)
const history = ref({ id: null, days: 0, points: [] })
const w = 480, h = 90

const vitals = computed(() => player.value?.vitals || { health: 0, energy: 0, energyMax: 0, nerve: 0, nerveMax: 0, happy: 0, happyMax: 0 })
const fin = computed(() => player.value?.finances || { money: 0, bankLocked: 0, portfolioValue: 0, netWorth: 0 })
const battleTotal = computed(() => {
  const b = player.value?.battleStats || {}; return (b.strength||0)+(b.speed||0)+(b.dexterity||0)+(b.defense||0)
})
const workTotal = computed(() => {
  const w = player.value?.workStats || {}; return (w.manuallabor||0)+(w.intelligence||0)+(w.endurance||0)+(w.employeEfficiency||0)
})

function fmtInt(n){ return Number(n||0).toLocaleString(undefined, { maximumFractionDigits: 0 }) }
function fmtMoney(n){ return `$${fmtInt(n)}` }
function fmtStat(n){ return Number(n||0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

async function load(){
  loading.value = true
  error.value = ''
  try {
    const id = route.params.id || new URLSearchParams(location.search).get('id')
    if (!id) throw new Error('Missing id')
    const res = await api.get(`/player/profile/${id}`)
    player.value = res.data || res
  } catch(e){
    error.value = e?.response?.data?.error || e?.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

async function loadHistory(){
  try {
    const id = route.params.id || new URLSearchParams(location.search).get('id')
    if (!id) return
    const res = await api.get(`/player/profile/${id}/history?days=${days.value}`)
    history.value = res.data || res
  } catch (_) {
    history.value = { id: null, days: 0, points: [] }
  }
}

function setDays(d){ days.value = d }

const points = computed(() => (history.value?.points||[]).map(p => p.netWorth))
const minVal = computed(() => points.value.length ? Math.min(...points.value) : 0)
const maxVal = computed(() => points.value.length ? Math.max(...points.value) : 0)
const svgPoints = computed(() => {
  const arr = points.value
  if (!arr.length) return ''
  const min = Math.min(...arr)
  const max = Math.max(...arr)
  const span = max - min || 1
  return arr.map((v, i) => {
    const x = Math.round((i / Math.max(1, arr.length - 1)) * w)
    const y = Math.round(h - ((v - min) / span) * h)
    return `${x},${y}`
  }).join(' ')
})

onMounted(async () => { await load(); await loadHistory() })
watch(days, loadHistory)
watch(() => route.params.id, async () => { await load(); await loadHistory() })
</script>

<style scoped>
.profile__head { display:flex; align-items:center; justify-content: space-between; gap: 12px; }
.profile__title { display:flex; align-items:center; gap: 10px; font-size: 18px; }
.profile__vitals { display:flex; gap: 16px; }
.profile__grid { margin-top: 12px; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.kv { list-style:none; padding:0; margin: 6px 0 0 0; }
.kv li { display:flex; justify-content: space-between; padding: 2px 0; }
.kv .k { color: var(--muted); }
.kv .v { font-weight: 600; }
.table-wrap { width: 100%; overflow: auto; }
.profile__holdings { max-height: 240px; }
.tbl { width:100%; border-collapse: collapse; font-size: 13px; }
.tbl th, .tbl td { padding: 4px 6px; border-bottom: 1px solid rgba(255,255,255,0.08); white-space: nowrap; }
.tbl td.num { text-align: right; font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }
.profile__head2 { display:flex; align-items:center; justify-content: space-between; }
.tabs { display:flex; gap: 6px; }
.tabs button { padding: 6px 10px; border-radius: 8px; border: 1px solid #555; background: #2b2b2b; color:#fff; cursor:pointer; }
.tabs button.active { border-color: #5ac8fa; background: #233041; }
.sparkline { height: 110px; display:flex; align-items: center; justify-content: center; }
.sparkline svg { width: 100%; height: 100%; }
.profile__panel--full { grid-column: 1 / -1; }
.sparkline__caption { font-size: 12px; margin: 4px 0 6px; }
.sparkline__scale { display:flex; justify-content: space-between; font-size: 11px; margin-top: 4px; }
</style>
