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
      <div v-if="!hasVault" class="msg msg--warn u-mt-8">
        Your active home doesn't have the Vault upgrade. Visit Real Estate to install it.
      </div>
    </div>

    <div class="grid u-mt-8" v-if="hasVault">
      <div class="panel">
        <h3>Deposit</h3>
        <div class="form">
          <input class="input" type="number" min="1" v-model.number="depositAmt" />
          <button class="btn" @click="doDeposit" :disabled="busy || depositAmt<=0">Deposit</button>
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

    <div v-if="msg" class="u-mt-8 msg" :class="{ ok: msgOk, err: !msgOk }">{{ msg }}</div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/client'
import { usePlayerStore } from '../stores/player'

const store = usePlayerStore()
const balance = ref(0)
const hasVault = ref(false)
const home = ref('')
const busy = ref(false)
const msg = ref('')
const msgOk = ref(true)
const depositAmt = ref(1000)
const withdrawAmt = ref(1000)

function fmtMoney(n){ return `$${Number(n||0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` }
function getUserId(){ try { const u=JSON.parse(localStorage.getItem('nc_user')||'null'); return u?._id || u?.id || null } catch { return null } }

async function ensurePlayer(){
  if (store.player?.user) return
  try {
    const raw = localStorage.getItem('nc_user')
    if (raw){ let u = raw; try { const o=JSON.parse(raw); u = o?._id || o?.id || raw } catch {}
      await store.loadByUser(u) }
  } catch {}
}

async function load(){
  const uid = getUserId(); if (!uid) return
  const { data } = await api.get(`/vault/${uid}`)
  balance.value = Number(data?.balance||0)
  hasVault.value = !!data?.hasVault
  home.value = data?.home || ''
}

async function doDeposit(){
  busy.value = true; msg.value=''
  try{
    const uid = getUserId(); if (!uid) throw new Error('Not authenticated')
    const { data } = await api.post('/vault/deposit', { userId: uid, amount: depositAmt.value })
    balance.value = Number(data?.balance||0)
    await store.loadByUser(store.player.user)
    msgOk.value = true; msg.value = 'Deposited.'
  } catch(e){ msgOk.value=false; msg.value = e?.response?.data?.error || e?.message || 'Failed' }
  finally{ busy.value=false }
}

async function doWithdraw(){
  busy.value = true; msg.value=''
  try{
    const uid = getUserId(); if (!uid) throw new Error('Not authenticated')
    const { data } = await api.post('/vault/withdraw', { userId: uid, amount: withdrawAmt.value })
    balance.value = Number(data?.balance||0)
    await store.loadByUser(store.player.user)
    msgOk.value = true; msg.value = 'Withdrawn.'
  } catch(e){ msgOk.value=false; msg.value = e?.response?.data?.error || e?.message || 'Failed' }
  finally{ busy.value=false }
}

onMounted(async () => { await ensurePlayer(); await load() })
</script>

<style scoped>
.kv { display:grid; grid-template-columns: 160px 1fr; gap: 6px; }
.kv .k { color: var(--muted, #99a2b2); }
.kv .v { font-weight: 600; }
.grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.panel { border: 1px solid var(--border, #2b2f38); border-radius: 8px; padding: 10px; background: var(--panel, #171a2b); }
.form { display:flex; gap: 8px; align-items: center; }
.input { padding: 6px 8px; border-radius: 8px; border: 1px solid var(--border, rgba(255,255,255,0.18)); background:#0f1421; color: var(--text, #e8eaf6); }
.btn { border: 1px solid var(--border, #2b2f38); background: rgba(255,255,255,0.06); padding: 6px 10px; border-radius: 8px; cursor: pointer; color: var(--text, #e8eaf6); }
.msg { padding:8px 10px; border-radius: 8px; }
.msg.ok { background: rgba(46,204,113,0.1); border: 1px solid rgba(46,204,113,0.4); }
.msg.err { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.4); }
.msg--warn { background: rgba(241,196,15,0.1); border: 1px solid rgba(241,196,15,0.4); }
</style>
