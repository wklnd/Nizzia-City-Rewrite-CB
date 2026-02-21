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
            <div class="hint">Cash: {{ fmtMoney(store.player?.money) }}</div>
          </div>
          <div class="field">
            <label>Period</label>
            <select v-model="period">
              <option v-for="(val, key) in rates" :key="key" :value="key">{{ label(key) }} — {{ (val*100).toFixed(2) }}% APR</option>
            </select>
          </div>
          <button class="btn--primary" :disabled="busy || !canDeposit" @click="makeDeposit">Deposit</button>
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
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'
import { fmt, fmtMoney, fmtDate } from '../utils/format'

const { store, ensurePlayer, reloadPlayer } = usePlayer()
const toast = useToast()

const rates = ref({})
const updatedAt = ref(null)
const ratesLoading = ref(true)
const acctsLoading = ref(true)
const accounts = ref([])
const amount = ref(0)
const period = ref('1w')
const busy = ref(false)

const label = (key) => ({ '1w': '1 Week', '2w': '2 Weeks', '1m': '1 Month', '3m': '3 Months', '6m': '6 Months' }[key] || key)
const date = (d) => fmtDate(d)

const canDeposit = computed(() => {
  const money = Number(store.player?.money || 0)
  const amt = Math.floor(Number(amount.value || 0))
  return store.player?.user && amt > 0 && amt <= money && !!rates.value[period.value]
})

function matured(a) { return new Date(a.endDate).getTime() <= Date.now() }

async function loadRates() {
  ratesLoading.value = true
  try {
    const { data } = await api.get('/bank/rates')
    rates.value = data?.rates || {}
    updatedAt.value = data?.updatedAt || null
    if (rates.value['1w']) period.value = '1w'
  } catch {
    rates.value = { '1w': 0.04, '2w': 0.06, '1m': 0.10, '3m': 0.14, '6m': 0.18 }
  } finally { ratesLoading.value = false }
}

async function loadAccounts() {
  acctsLoading.value = true
  try {
    const { data } = await api.get('/bank/accounts')
    accounts.value = data?.accounts || []
  } catch { accounts.value = [] }
  finally { acctsLoading.value = false }
}

async function makeDeposit() {
  if (!canDeposit.value) return
  busy.value = true
  try {
    const { data } = await api.post('/bank/deposit', { amount: Math.floor(Number(amount.value || 0)), period: period.value })
    toast.ok('Deposit created successfully')
    store.mergePartial({ money: data.money })
    await loadAccounts()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed to deposit') }
  finally { busy.value = false }
}

async function withdraw(a) {
  busy.value = true
  try {
    const { data } = await api.post('/bank/withdraw', { accountId: a._id })
    toast.ok(`Withdrawn ${fmtMoney(data?.payout?.total)} (interest ${fmtMoney(data?.payout?.interest)})`)
    store.mergePartial({ money: data.money })
    await loadAccounts()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed to withdraw') }
  finally { busy.value = false }
}

onMounted(async () => { await ensurePlayer(); await loadRates(); await loadAccounts() })
</script>

<style scoped>
.bank { max-width: 900px; margin: 0 auto; }
.rates { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 6px; }
.rate { display: flex; justify-content: space-between; padding: 6px 8px; border: 1px dashed var(--border); border-radius: 2px; font-size: 12px; }
.rate__period { font-weight: 600; }
.rate__apr { color: var(--muted); }
.list { display: flex; flex-direction: column; gap: 8px; }
.acct { border: 1px dashed var(--border); border-radius: 2px; padding: 8px; }
.acct__row { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; font-size: 12px; }
.acct__title { font-weight: 600; }
.acct__apr { color: var(--muted); font-size: 11px; }
</style>
