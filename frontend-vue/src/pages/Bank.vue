<template>
  <section class="bank">
    <h2>Bank</h2>

    <div class="grid">
      <div class="card">
        <h3>Rates</h3>
        <div v-if="ratesLoading" class="muted">Loading rates…</div>
        <template v-else>
          <div class="rates">
            <div v-for="(val, key) in rates" :key="key" class="rate">
              <div class="rate__period">{{ label(key) }}</div>
              <div class="rate__apr">{{ (val * 100).toFixed(2) }}% APR</div>
            </div>
          </div>
          <div class="muted" v-if="updatedAt">Updated: {{ new Date(updatedAt).toLocaleString() }}</div>
        </template>
      </div>

      <div class="card">
        <h3>New Deposit</h3>
        <div v-if="!store.player?.user" class="muted">Please log in to use the bank.</div>
        <template v-else>
          <div class="field">
            <label>Amount ($)</label>
            <input type="number" v-model.number="amount" min="1" step="1"/>
            <div class="hint">Cash: ${{ fmt(store.player?.money) }}</div>
          </div>
          <div class="field">
            <label>Period</label>
            <select v-model="period">
              <option v-for="(val, key) in rates" :key="key" :value="key">{{ label(key) }} — {{ (val*100).toFixed(2) }}% APR</option>
            </select>
          </div>
          <button :disabled="busy || !canDeposit" @click="makeDeposit">Deposit</button>
          <div class="error" v-if="error">{{ error }}</div>
          <div class="ok" v-if="okMsg">{{ okMsg }}</div>
        </template>
      </div>
    </div>

    <div class="card">
      <h3>Your Deposits</h3>
      <div v-if="acctsLoading" class="muted">Loading accounts…</div>
      <div v-else-if="accounts.length === 0" class="muted">No deposits yet.</div>
      <div v-else class="list">
        <div v-for="a in accounts" :key="a._id" class="acct">
          <div class="acct__row">
            <div class="acct__title">{{ label(a.period) }}</div>
            <div class="acct__apr">APR: {{ (a.interestRate * 100).toFixed(2) }}%</div>
          </div>
          <div class="acct__row">
            <div>Principal: ${{ fmt(a.depositedAmount) }}</div>
            <div>Start: {{ date(a.startDate) }}</div>
            <div>End: {{ date(a.endDate) }}</div>
          </div>
          <div class="acct__row">
            <div>Status: <strong>{{ a.isWithdrawn ? 'Withdrawn' : matured(a) ? 'Matured' : 'Locked' }}</strong></div>
            <button
              v-if="!a.isWithdrawn"
              :disabled="busy || !matured(a)"
              @click="withdraw(a)">
              Withdraw
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
  
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../api/client'
import { usePlayerStore } from '../stores/player'

const store = usePlayerStore()
const rates = ref({})
const updatedAt = ref(null)
const ratesLoading = ref(true)
const acctsLoading = ref(true)
const accounts = ref([])
const amount = ref(0)
const period = ref('1w')
const busy = ref(false)
const error = ref('')
const okMsg = ref('')

const label = (key) => ({ '1w': '1 Week', '2w': '2 Weeks', '1m': '1 Month', '3m': '3 Months', '6m': '6 Months' }[key] || key)
const fmt = (n) => Number(n || 0).toLocaleString()
const date = (d) => new Date(d).toLocaleString()

const canDeposit = computed(() => {
  const money = Number(store.player?.money || 0)
  const amt = Math.floor(Number(amount.value || 0))
  return store.player?.user && amt > 0 && amt <= money && !!rates.value[period.value]
})

function matured(a) { return new Date(a.endDate).getTime() <= Date.now() }

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

async function loadRates(){
  ratesLoading.value = true
  try {
    const { data } = await api.get('/bank/rates')
    rates.value = data?.rates || {}
    updatedAt.value = data?.updatedAt || null
    if (rates.value['1w']) period.value = '1w'
  } catch (e) {
    // fallback defaults if API missing
    rates.value = { '1w': 0.04, '2w': 0.06, '1m': 0.10, '3m': 0.14, '6m': 0.18 }
  } finally { ratesLoading.value = false }
}

async function loadAccounts(){
  acctsLoading.value = true
  try {
    if (!store.player?.user) return
    const { data } = await api.get(`/bank/accounts/${store.player.user}`)
    accounts.value = data?.accounts || []
  } catch {
    accounts.value = []
  } finally { acctsLoading.value = false }
}

async function makeDeposit(){
  if (!canDeposit.value) return
  busy.value = true; error.value = ''; okMsg.value = ''
  try {
    const { data } = await api.post('/bank/deposit', { userId: store.player.user, amount: Math.floor(Number(amount.value||0)), period: period.value })
    okMsg.value = 'Deposit created successfully.'
    await store.loadByUser(store.player.user)
    await loadAccounts()
  } catch (e) { error.value = e?.response?.data?.error || e?.message || 'Failed to deposit' }
  finally { busy.value = false }
}

async function withdraw(a){
  busy.value = true; error.value = ''; okMsg.value = ''
  try {
    const { data } = await api.post('/bank/withdraw', { userId: store.player.user, accountId: a._id })
    okMsg.value = `Withdrawn $${fmt(data?.payout?.total)} (principal $${fmt(data?.payout?.principal)}, interest $${fmt(data?.payout?.interest)})`
    await store.loadByUser(store.player.user)
    await loadAccounts()
  } catch (e) { error.value = e?.response?.data?.error || e?.message || 'Failed to withdraw' }
  finally { busy.value = false }
}

onMounted(async () => { await ensurePlayer(); await loadRates(); await loadAccounts() })
</script>

<style scoped>
.bank { max-width: 1000px; margin: 24px auto; padding: 0 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; color: var(--text); }
.rates { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
.rate { display:flex; justify-content: space-between; padding: 8px 10px; border: 1px dashed var(--border); border-radius: 8px; }
.rate__period { font-weight: 600; }
.rate__apr { color: var(--muted); }
.field { display:flex; flex-direction: column; gap:6px; margin-bottom: 10px; }
label { font-size: 12px; color: var(--muted); }
input, select { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 8px; }
.hint { font-size: 12px; color: var(--muted); }
.list { display: flex; flex-direction: column; gap: 10px; }
.acct { border: 1px dashed var(--border); border-radius: 8px; padding: 10px; }
.acct__row { display:flex; gap: 16px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.acct__title { font-weight: 600; }
.acct__apr { color: var(--muted); }
.muted { color: var(--muted); font-size: 12px; }
.error { color: #ff5f73; margin-top: 8px; }
.ok { color: #5fff9a; margin-top: 8px; }
button { padding: 8px 12px; background: var(--accent); color: #fff; border: 1px solid transparent; border-radius: 8px; cursor: pointer; }
button:disabled { opacity: 0.6; cursor: not-allowed }
</style>
