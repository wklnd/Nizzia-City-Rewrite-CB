<template>
  <section>
    <h2>Stocks</h2>
  <div class="stocks__grid u-mt-8">
      <!-- Market -->
      <div class="panel">
        <div class="stocks__head">
          <h3>Market</h3>
          <button class="btn" @click="loadList" :disabled="loading">Refresh</button>
        </div>
        <div class="table-wrap" style="max-height:300px;">
          <table class="tbl">
            <thead>
              <tr><th>Symbol</th><th>Name</th><th class="num">Price</th><th class="num">24h</th></tr>
            </thead>
            <tbody>
              <tr v-for="s in list" :key="s.symbol" :class="{ active: s.symbol===symbol }" @click="select(s.symbol)">
                <td>{{ s.symbol }}</td>
                <td class="muted">{{ s.name }}</td>
                <td class="num">{{ fmtPrice(s.price, s.decimals) }}</td>
                <td class="num" :class="{ up: s.change>0, down: s.change<0 }">
                  <span>{{ s.change>0? '+' : ''}}{{ s.change.toFixed(s.decimals ?? 2) }}</span>
                  <span class="muted"> ({{ s.changePct>0? '+' : ''}}{{ s.changePct.toFixed(2) }}%)</span>
                </td>
              </tr>
              <tr v-if="!list.length"><td colspan="4" class="muted">No stocks</td></tr>
            </tbody>
          </table>
        </div>
      </div>

  <!-- Quote + chart + trade -->
  <div class="panel stocks__quote">
        <div class="stocks__head">
          <div>
            <h3 v-if="quote">{{ quote.symbol }} <span class="muted">— {{ quote.name }}</span></h3>
            <h3 v-else>Quote</h3>
            <div v-if="quote" class="muted">Price: <strong>{{ fmtPrice(quote.price, quote.decimals) }}</strong></div>
          </div>
          <div class="tabs">
            <button :class="{ active: range==='1d' }" @click="setRange('1d')">1d</button>
            <button :class="{ active: range==='7d' }" @click="setRange('7d')">7d</button>
            <button :class="{ active: range==='30d' }" @click="setRange('30d')">30d</button>
            <button :class="{ active: range==='90d' }" @click="setRange('90d')">90d</button>
          </div>
        </div>
        <div class="sparkline">
          <svg :viewBox="`0 0 ${w} ${h}`" preserveAspectRatio="none">
            <polyline v-if="points.length" :points="svgPoints" fill="none" stroke="#5ac8fa" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
          </svg>
          <div class="muted" v-if="!points.length">No data</div>
        </div>
        <div class="sparkline__scale muted" v-if="points.length">
          <span>{{ fmtPrice(minVal, quote?.decimals ?? 2) }}</span>
          <span>{{ fmtPrice(maxVal, quote?.decimals ?? 2) }}</span>
        </div>

        <div class="trade u-mt-12">
          <label class="block">
            <span class="lbl">Shares</span>
            <input type="number" min="1" v-model.number="shares" />
          </label>
          <div class="actions">
            <button class="btn" @click="doBuy" :disabled="!canTrade || busy">{{ busy? 'Busy…' : 'Buy' }}</button>
            <button class="btn" @click="doSell" :disabled="!canTrade || busy">{{ busy? 'Busy…' : 'Sell' }}</button>
            <span class="msg" :class="{ err: !!error, ok: !!okMsg }">{{ error || okMsg }}</span>
          </div>
          <div class="muted">Money: {{ moneyFmt }}</div>
        </div>
      </div>

      <!-- Portfolio (separate card) -->
      <div class="panel stocks__portfolio">
        <div class="stocks__head">
          <h3>Portfolio</h3>
          <button class="btn" @click="loadPortfolio" :disabled="loading">Refresh</button>
        </div>
        <div class="table-wrap" style="max-height:300px;">
          <table class="tbl">
            <thead>
              <tr><th>Symbol</th><th class="num">Shares</th><th class="num">Avg</th><th class="num">Price</th><th class="num">Value</th><th class="num">P/L</th></tr>
            </thead>
            <tbody>
              <tr v-for="h in portfolio.holdings" :key="h.symbol">
                <td>{{ h.symbol }}</td>
                <td class="num">{{ fmtInt(h.shares) }}</td>
                <td class="num">{{ fmtPrice(h.avgPrice) }}</td>
                <td class="num">{{ fmtPrice(h.currentPrice) }}</td>
                <td class="num">{{ fmtPrice(h.value) }}</td>
                <td class="num" :class="plClass(h)">{{ fmtPrice(h.value - (h.shares*h.avgPrice)) }}</td>
              </tr>
              <tr v-if="!portfolio.holdings.length"><td colspan="6" class="muted">No holdings</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '../api/client'
import { usePlayerStore } from '../stores/player'

const store = usePlayerStore()
const userId = computed(() => {
  try { return JSON.parse(localStorage.getItem('nc_user')||'null')?._id || null } catch { return null }
})

const loading = ref(false)
const busy = ref(false)
const error = ref('')
const okMsg = ref('')

const list = ref([])
const symbol = ref('')
const quote = ref(null)
const range = ref('1d')
const shares = ref(1)

const portfolio = ref({ money: 0, holdings: [] })
const moneyFmt = computed(() => `$${Number((portfolio.value.money ?? store.player?.money) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`)

const w = 520, h = 120
const points = computed(() => (quote.value?.history||[]).map(p => p.price))
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

function fmtInt(n){ return Number(n||0).toLocaleString(undefined, { maximumFractionDigits: 0 }) }
function fmtPrice(n, decimals=2){
  const d = Number.isInteger(decimals) ? decimals : 2
  const num = Number(n||0).toFixed(d)
  return `$${Number(num).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`
}
function plClass(h){
  const pl = (h.value||0) - (h.shares*h.avgPrice)
  return { up: pl>0, down: pl<0 }
}

async function loadList(){
  loading.value = true
  try {
    const res = await api.get('/stocks')
    list.value = res.data || res
    if (!symbol.value && list.value.length) symbol.value = list.value[0].symbol
  } finally { loading.value = false }
}

async function loadQuote(){
  if (!symbol.value) { quote.value = null; return }
  try {
    const res = await api.get(`/stocks/${symbol.value}?range=${range.value}`)
    quote.value = res.data || res
  } catch { quote.value = null }
}

async function loadPortfolio(){
  try {
    if (!userId.value) return
    const res = await api.get(`/stocks/portfolio/${userId.value}`)
    portfolio.value = res.data || res
  } catch { portfolio.value = { money: 0, holdings: [] } }
}

function setRange(r){ range.value = r }
function select(sym){ symbol.value = sym }
const canTrade = computed(() => !!(symbol.value && shares.value>0 && userId.value))

async function doBuy(){
  if (!canTrade.value) return
  error.value=''; okMsg.value=''; busy.value=true
  try {
    const res = await api.post('/stocks/buy', { userId: userId.value, symbol: symbol.value, shares: Number(shares.value)||1 })
    // Refresh both portfolio and global player money
    await loadPortfolio()
    await store.loadByUser(userId.value)
    okMsg.value = 'Bought.'
  } catch(e){ error.value = e?.response?.data?.error || e?.message || 'Buy failed' }
  finally { busy.value=false }
}

async function doSell(){
  if (!canTrade.value) return
  error.value=''; okMsg.value=''; busy.value=true
  try {
    const res = await api.post('/stocks/sell', { userId: userId.value, symbol: symbol.value, shares: Number(shares.value)||1 })
    await loadPortfolio()
    await store.loadByUser(userId.value)
    okMsg.value = 'Sold.'
  } catch(e){ error.value = e?.response?.data?.error || e?.message || 'Sell failed' }
  finally { busy.value=false }
}

onMounted(async () => { await loadList(); await loadQuote(); await loadPortfolio() })
watch(symbol, async () => { await loadQuote() })
watch(range, async () => { await loadQuote() })
</script>

<style scoped>
.stocks__grid { display:grid; grid-template-columns: 1.2fr 1.8fr; gap: 12px; }
.stocks__quote { grid-column: 2; }
.stocks__portfolio { grid-column: 2; }
.stocks__head { display:flex; align-items:center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.table-wrap { width: 100%; overflow: auto; }
.tbl { width:100%; border-collapse: collapse; font-size: 13px; }
.tbl th, .tbl td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.tbl td.num, .tbl th.num { text-align: right; font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; white-space: nowrap; }
.tbl tr { cursor: pointer; }
.tbl tr.active { background: rgba(90,200,250,0.08); }
.up { color: #77d37b; }
.down { color: #ff6b6b; }

.tabs { display:flex; gap: 6px; }
.tabs button { padding: 6px 10px; border-radius: 8px; border: 1px solid #555; background: #2b2b2b; color:#fff; cursor:pointer; }
.tabs button.active { border-color: #5ac8fa; background: #233041; }
.sparkline { height: 140px; display:flex; align-items: center; justify-content: center; }
.sparkline svg { width: 100%; height: 100%; }

.trade { display:flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.block { display:block; }
.lbl { display:block; font-size:12px; color: var(--muted); margin-bottom: 4px; }
input[type="number"] { width: 120px; padding: 8px; border-radius: 6px; border: 1px solid #555; background: #2b2b2b; color: #fff; }
.actions { display:flex; align-items:center; gap: 10px; }
.msg { font-size: 12px; }
.msg.ok { color: #a3d977; }
.msg.err { color: #ff6b6b; }

@media (max-width: 1200px){ .stocks__grid { grid-template-columns: 1fr; } }
</style>
