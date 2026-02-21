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
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'
import { fmtInt, fmtMoney } from '../utils/format'

const { store, ensurePlayer, reloadPlayer } = usePlayer()
const toast = useToast()

const loading = ref(false)
const busy = ref(false)

const list = ref([])
const symbol = ref('')
const quote = ref(null)
const range = ref('1d')
const shares = ref(1)

const portfolio = ref({ money: 0, holdings: [] })
const moneyFmt = computed(() => fmtMoney((portfolio.value.money ?? store.player?.money) || 0))

const w = 520, h = 120
const points = computed(() => (quote.value?.history || []).map(p => p.price))
const minVal = computed(() => points.value.length ? Math.min(...points.value) : 0)
const maxVal = computed(() => points.value.length ? Math.max(...points.value) : 0)
const svgPoints = computed(() => {
  const arr = points.value
  if (!arr.length) return ''
  const min = Math.min(...arr), max = Math.max(...arr), span = max - min || 1
  return arr.map((v, i) => {
    const x = Math.round((i / Math.max(1, arr.length - 1)) * w)
    const y = Math.round(h - ((v - min) / span) * h)
    return `${x},${y}`
  }).join(' ')
})

function fmtPrice(n, decimals = 2) {
  const d = Number.isInteger(decimals) ? decimals : 2
  const num = Number(n || 0).toFixed(d)
  return `$${Number(num).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`
}
function plClass(h) {
  const pl = (h.value || 0) - (h.shares * h.avgPrice)
  return { up: pl > 0, down: pl < 0 }
}

async function loadList() {
  loading.value = true
  try {
    const res = await api.get('/stocks')
    list.value = res.data || res
    if (!symbol.value && list.value.length) symbol.value = list.value[0].symbol
  } finally { loading.value = false }
}
async function loadQuote() {
  if (!symbol.value) { quote.value = null; return }
  try { const res = await api.get(`/stocks/${symbol.value}?range=${range.value}`); quote.value = res.data || res }
  catch { quote.value = null }
}
async function loadPortfolio() {
  try {
    const res = await api.get('/stocks/portfolio')
    portfolio.value = res.data || res
  } catch { portfolio.value = { money: 0, holdings: [] } }
}

function setRange(r) { range.value = r }
function select(sym) { symbol.value = sym }
const canTrade = computed(() => !!(symbol.value && shares.value > 0 && store.player?.user))

async function doBuy() {
  if (!canTrade.value) return
  busy.value = true
  try {
    const { data } = await api.post('/stocks/buy', { symbol: symbol.value, shares: Number(shares.value) || 1 })
    store.mergePartial({ money: data.money })
    await loadPortfolio()
    toast.ok('Bought.')
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Buy failed') }
  finally { busy.value = false }
}
async function doSell() {
  if (!canTrade.value) return
  busy.value = true
  try {
    const { data } = await api.post('/stocks/sell', { symbol: symbol.value, shares: Number(shares.value) || 1 })
    store.mergePartial({ money: data.money })
    await loadPortfolio()
    toast.ok('Sold.')
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Sell failed') }
  finally { busy.value = false }
}

onMounted(async () => { await ensurePlayer(); await loadList(); await loadQuote(); await loadPortfolio() })
watch(symbol, () => loadQuote())
watch(range, () => loadQuote())
</script>

<style scoped>
.stocks__grid { display: grid; grid-template-columns: 1.2fr 1.8fr; gap: 10px; }
.stocks__quote { grid-column: 2; }
.stocks__portfolio { grid-column: 2; }
.stocks__head { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px; }
.tbl tr { cursor: pointer; }
.tbl tr:hover { background: var(--panel-hover); }
.tbl tr.active { background: var(--accent-muted); }
.sparkline__scale { display: flex; justify-content: space-between; font-size: 10px; color: var(--muted); margin-top: 3px; }
.trade { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.block { display: block; }
.lbl { display: block; font-size: 11px; color: var(--muted); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.03em; }
input[type="number"] { width: 100px; }
@media (max-width: 1200px) { .stocks__grid { grid-template-columns: 1fr; } }
</style>
