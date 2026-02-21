<template>
  <section class="money">
    <h2>Money</h2>

    <!-- ─── Wallet Overview ─── -->
    <div class="grid">
      <div class="card wallet">
        <h3>Wallet</h3>
        <div v-if="walletLoading" class="muted">Loading wallet…</div>
        <template v-else-if="wallet">
          <div class="balance">${{ fmt(wallet.balance) }}</div>
          <div class="wallet__stats">
            <div class="stat">
              <span class="stat__label">Income (24h)</span>
              <span class="stat__val positive">+${{ fmt(wallet.income24h) }}</span>
            </div>
            <div class="stat">
              <span class="stat__label">Expenses (24h)</span>
              <span class="stat__val negative">-${{ fmt(Math.abs(wallet.expenses24h)) }}</span>
            </div>
            <div class="stat">
              <span class="stat__label">Transactions (24h)</span>
              <span class="stat__val">{{ wallet.txCount24h }}</span>
            </div>
          </div>
          <div class="cap-bar">
            <div class="cap-bar__label">Daily Transfer Limit</div>
            <div class="cap-bar__track">
              <div class="cap-bar__fill" :style="{ width: capPct + '%' }"></div>
            </div>
            <div class="cap-bar__text">${{ fmt(wallet.dailySent) }} / ${{ fmt(wallet.dailyCap) }}</div>
          </div>
        </template>
      </div>

      <!-- ─── Send Money ─── -->
      <div class="card">
        <h3>Send Money</h3>
        <div v-if="!store.player?.user" class="muted">Log in to send money.</div>
        <template v-else>
          <div class="field">
            <label>Recipient (name or ID)</label>
            <input type="text" v-model="recipient" placeholder="Player name or ID" />
          </div>
          <div class="field">
            <label>Amount ($)</label>
            <input type="number" v-model.number="sendAmount" min="1" step="1" />
            <div class="hint">Available: ${{ fmt(store.player?.money) }}</div>
          </div>
          <button class="btn btn--primary" :disabled="busy || !canSend" @click="doTransfer">Send</button>
        </template>
      </div>
    </div>

    <!-- ─── Transaction History ─── -->
    <div class="card history">
      <div class="history__header">
        <h3>Transaction History</h3>
        <select v-model="filter" @change="loadHistory(1)" class="filter-select">
          <option value="all">All types</option>
          <option value="transfer_in,transfer_out">Transfers</option>
          <option value="crime">Crime</option>
          <option value="casino_win,casino_loss">Casino</option>
          <option value="job">Job</option>
          <option value="business">Business</option>
          <option value="stock_buy,stock_sell">Stocks</option>
          <option value="bank_deposit,bank_withdraw">Bank &amp; Vault</option>
          <option value="purchase,sale">Buy &amp; Sell</option>
          <option value="property">Property</option>
          <option value="cartel">Cartel</option>
          <option value="gym">Gym</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div v-if="historyLoading" class="muted">Loading transactions…</div>
      <div v-else-if="!transactions.length" class="muted">No transactions found.</div>
      <div v-else class="tx-list">
        <div v-for="tx in transactions" :key="tx._id" class="tx">
          <div class="tx__row">
            <span class="tx__type" :class="typeClass(tx.type)">{{ typeLabel(tx.type) }}</span>
            <span class="tx__amount" :class="tx.amount >= 0 ? 'positive' : 'negative'">
              {{ tx.amount >= 0 ? '+' : '' }}${{ fmt(Math.abs(tx.amount)) }}
            </span>
          </div>
          <div class="tx__row">
            <span class="tx__desc">{{ tx.description || '—' }}</span>
            <span class="tx__bal">Bal: ${{ fmt(tx.balanceAfter) }}</span>
          </div>
          <div class="tx__date">{{ fmtDate(tx.createdAt) }}</div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button :disabled="page <= 1" @click="loadHistory(page - 1)">&laquo; Prev</button>
        <span class="pagination__info">{{ page }} / {{ totalPages }}</span>
        <button :disabled="page >= totalPages" @click="loadHistory(page + 1)">Next &raquo;</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../api/client'
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'
import { fmt, fmtDate } from '../utils/format'

const { store, ensurePlayer } = usePlayer()
const toast = useToast()

const TYPE_LABELS = {
  transfer_in: 'Received', transfer_out: 'Sent', crime: 'Crime', job: 'Job',
  casino_win: 'Casino Win', casino_loss: 'Casino Loss', sale: 'Sale', purchase: 'Purchase',
  bank_deposit: 'Bank Deposit', bank_withdraw: 'Bank Withdraw', business: 'Business',
  cartel: 'Cartel', stock_buy: 'Stock Buy', stock_sell: 'Stock Sell', property: 'Property',
  gym: 'Gym', hospital: 'Hospital', other: 'Other',
}
const typeLabel = (t) => TYPE_LABELS[t] || t
const typeClass = (t) => `type--${t}`

// ── Wallet ──
const wallet = ref(null)
const walletLoading = ref(true)
const capPct = computed(() => {
  if (!wallet.value) return 0
  const { dailySent, dailyCap } = wallet.value
  return dailyCap ? Math.min(100, (dailySent / dailyCap) * 100) : 0
})

async function loadWallet() {
  walletLoading.value = true
  try { const { data } = await api.get('/money/wallet'); wallet.value = data }
  catch { wallet.value = null }
  finally { walletLoading.value = false }
}

// ── Transfer ──
const recipient = ref('')
const sendAmount = ref(0)
const busy = ref(false)
const canSend = computed(() => {
  const money = Number(store.player?.money || 0)
  const amt = Math.floor(Number(sendAmount.value || 0))
  return store.player?.user && recipient.value.trim() && amt >= 1 && amt <= money
})

async function doTransfer() {
  if (!canSend.value) return
  busy.value = true
  try {
    const { data } = await api.post('/money/transfer', {
      recipient: recipient.value.trim(),
      amount: Math.floor(Number(sendAmount.value)),
    })
    toast.ok(`Sent $${fmt(data.sent)} to ${data.recipientName}`)
    recipient.value = ''; sendAmount.value = 0
    if (data?.senderBalance != null) store.mergePartial({ money: data.senderBalance })
    await Promise.all([loadWallet(), loadHistory(1)])
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Transfer failed')
  } finally { busy.value = false }
}

// ── History ──
const transactions = ref([])
const historyLoading = ref(true)
const page = ref(1)
const totalPages = ref(1)
const filter = ref('all')

async function loadHistory(p = 1) {
  historyLoading.value = true; page.value = p
  try {
    const params = { page: p }
    if (filter.value && filter.value !== 'all') params.filter = filter.value
    const { data } = await api.get('/money/history', { params })
    transactions.value = data.transactions || []
    totalPages.value = data.totalPages || 1
  } catch { transactions.value = [] }
  finally { historyLoading.value = false }
}

onMounted(async () => {
  await ensurePlayer()
  await Promise.all([loadWallet(), loadHistory(1)])
})
</script>

<style scoped>
.money { max-width: 900px; margin: 0 auto; }

/* Wallet */
.balance { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; margin: 6px 0 12px; }
.wallet__stats { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.stat { display: flex; flex-direction: column; gap: 2px; }
.stat__label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
.stat__val { font-size: 13px; font-weight: 600; }
.positive { color: var(--ok); }
.negative { color: var(--danger); }

.cap-bar { margin-top: 4px; }
.cap-bar__label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); margin-bottom: 4px; }
.cap-bar__track { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.cap-bar__fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.3s ease; }
.cap-bar__text { font-size: 11px; color: var(--muted); margin-top: 2px; }

/* History */
.history__header { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.history__header h3 { margin: 0; }
.filter-select { font-size: 11px; padding: 4px 6px; background: var(--panel); border: 1px solid var(--border); color: var(--text); border-radius: 2px; }

.tx-list { display: flex; flex-direction: column; gap: 6px; }
.tx { border: 1px dashed var(--border); border-radius: 2px; padding: 8px 10px; }
.tx__row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.tx__type { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; padding: 2px 6px; border-radius: 2px; background: var(--border); }
.tx__amount { font-size: 14px; font-weight: 700; }
.tx__desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
.tx__bal { font-size: 11px; color: var(--muted); }
.tx__date { font-size: 10px; color: var(--muted); margin-top: 4px; }

/* Type badges */
.type--transfer_in { background: #1a3a2a; color: #4ade80; }
.type--transfer_out { background: #3a1a1a; color: #f87171; }
.type--crime { background: #2a2a1a; color: #facc15; }
.type--casino_win { background: #1a2a3a; color: #60a5fa; }
.type--casino_loss { background: #3a1a2a; color: #f472b6; }
.type--business { background: #1a2a2a; color: #2dd4bf; }
.type--cartel { background: #2a1a2a; color: #c084fc; }
</style>
