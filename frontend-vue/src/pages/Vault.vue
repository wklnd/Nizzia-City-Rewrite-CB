<template>
  <section class="vault">
    <h2>Vault</h2>
    <p class="muted">Store your money securely. Requires the Vault upgrade in your active home.</p>

    <div class="panel u-mt-8">
      <div class="kv">
        <div><span class="k">Has Vault</span><span class="v">{{ hasVault ? 'Yes' : 'No' }}</span></div>
        <div><span class="k">Vault Balance</span><span class="v">{{ fmtMoney(balance) }}</span></div>
        <div><span class="k">Cash</span><span class="v">{{ fmtMoney(store.player?.money || 0) }}</span></div>
        <div><span class="k">Home</span><span class="v">{{ home }}</span></div>
      </div>
      <div v-if="!hasVault" class="msg err u-mt-8">
        Your active home doesn't have the Vault upgrade. Visit Real Estate to install it.
      </div>
    </div>

    <div class="grid u-mt-8" v-if="hasVault">
      <div class="panel">
        <h3>Deposit</h3>
        <div class="form">
          <input class="input" type="number" min="1" v-model.number="depositAmt" />
          <button class="btn btn--primary" @click="doDeposit" :disabled="busy || depositAmt<=0">Deposit</button>
        </div>
      </div>
      <div class="panel">
        <h3>Withdraw</h3>
        <div class="form">
          <input class="input" type="number" min="1" v-model.number="withdrawAmt" />
          <button class="btn" @click="doWithdraw" :disabled="busy || withdrawAmt<=0">Withdraw</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/client'
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'
import { fmtMoney } from '../utils/format'

const { store, ensurePlayer, reloadPlayer } = usePlayer()
const toast = useToast()
const balance = ref(0)
const hasVault = ref(false)
const home = ref('')
const busy = ref(false)
const depositAmt = ref(1000)
const withdrawAmt = ref(1000)

async function load() {
  const { data } = await api.get('/vault')
  balance.value = Number(data?.balance || 0)
  hasVault.value = !!data?.hasVault
  home.value = data?.home || ''
}

async function doDeposit() {
  busy.value = true
  try {
    const { data } = await api.post('/vault/deposit', { amount: depositAmt.value })
    balance.value = Number(data?.balance || 0)
    store.mergePartial({ money: data.money })
    toast.ok('Deposited.')
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed') }
  finally { busy.value = false }
}

async function doWithdraw() {
  busy.value = true
  try {
    const { data } = await api.post('/vault/withdraw', { amount: withdrawAmt.value })
    balance.value = Number(data?.balance || 0)
    store.mergePartial({ money: data.money })
    toast.ok('Withdrawn.')
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed') }
  finally { busy.value = false }
}

onMounted(async () => { await ensurePlayer(); await load() })
</script>

<style scoped>
.vault { max-width: 600px; margin: 0 auto; }
.form { display: flex; gap: 6px; align-items: center; }
</style>
