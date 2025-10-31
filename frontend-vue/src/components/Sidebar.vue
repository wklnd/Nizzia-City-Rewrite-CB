<template>
  <aside class="sidebar">
    <div class="status-effects">
        <p>effect</p>
    </div>
    <div class="info">
      <p id="ui-name">Name: {{ store.player?.name || '—' }}</p>
      <p id="ui-money">Money: {{ money }}</p>
      <p id="ui-level">Level: {{ store.player?.level || 1 }}</p>
      <p id="ui-points">Points: {{ store.player?.points || 0 }}</p>
    </div>

    <div class="info">
      <p id="ui-energy-label">Energy: {{ eNow }}/{{ eMax }}</p>
      <div class="progress-bar"><div class="progress-fill energy" :style="{ width: pct(eNow, eMax) + '%' }"></div></div>

      <p id="ui-nerve-label">Nerve: {{ nNow }}/{{ nMax }}</p>
      <div class="progress-bar"><div class="progress-fill nerve" :style="{ width: pct(nNow, nMax) + '%' }"></div></div>

      <p id="ui-happy-label">Happy: {{ hNow }}/{{ hMax }}</p>
      <div class="progress-bar"><div class="progress-fill happy" :style="{ width: pct(hNow, hMax) + '%' }"></div></div>

  <p id="ui-hp-label">HP: {{ hpNow }}/{{ hpMax }}</p>
  <div class="progress-bar"><div class="progress-fill life" :style="{ width: pct(hpNow, hpMax) + '%' }"></div></div>
    </div>

    <ul>
      <li><RouterLink to="/">Home</RouterLink></li>
      <li><RouterLink to="/inventory">Inventory</RouterLink></li>
      <li><RouterLink to="/city">City</RouterLink></li>
      <li><RouterLink to="/job">Job</RouterLink></li>
      <li><RouterLink to="/gym">Gym</RouterLink></li>
      <li><RouterLink to="/casino">Casino</RouterLink></li>
      <li><RouterLink to="/stocks">Stocks</RouterLink></li>
      <li><RouterLink to="/crimes">Crimes</RouterLink></li>
      <li><RouterLink to="/money">Money</RouterLink></li>
      <li><RouterLink to="/property">Property</RouterLink></li>
    </ul>

    <div id="dev-menu" class="info u-mt-16" v-show="isDev">
      <h3>Developer</h3>
      <div class="u-mb-8">
        <label>Add Money</label>
        <div class="u-flex u-gap-6">
          <input v-model.number="devMoney" type="number" />
          <button @click="doDev('add-money', devMoney)" class="btn">Add</button>
        </div>
      </div>
      <div class="u-mb-8">
        <label>Add Energy</label>
        <div class="u-flex u-gap-6">
          <input v-model.number="devEnergy" type="number" />
          <button @click="doDev('add-energy', devEnergy)" class="btn">Add</button>
        </div>
      </div>
      <div>
        <label>Add Nerve</label>
        <div class="u-flex u-gap-6">
          <input v-model.number="devNerve" type="number" />
          <button @click="doDev('add-nerve', devNerve)" class="btn">Add</button>
        </div>
      </div>
      <div class="u-mt-8 msg" :class="{ ok: devMsgOk, err: !devMsgOk }">{{ devMsg }}</div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import api from '../api/client'
import { usePlayerStore } from '../stores/player'

const store = usePlayerStore()
const user = ref(null)
const router = useRouter()

const eNow = computed(() => store.player?.energyStats?.energy ?? 0)
const eMax = computed(() => store.player?.energyStats?.energyMax ?? 0)
const nNow = computed(() => store.player?.nerveStats?.nerve ?? 0)
const nMax = computed(() => store.player?.nerveStats?.nerveMax ?? 0)
const hNow = computed(() => store.player?.happiness?.happy ?? 0)
const hMax = computed(() => store.player?.happiness?.happyMax ?? 0)
const hpNow = computed(() => typeof store.player?.health === 'number' ? store.player.health : 0)
const hpMax = 100
const money = computed(() => fmtMoney(store.player?.money || 0))

const isDev = computed(() => store.player?.playerRole === 'Developer')

const devMoney = ref(100000)
const devEnergy = ref(10)
const devNerve = ref(5)
const devMsg = ref('')
const devMsgOk = ref(true)

function pct(cur, max){ return max > 0 ? Math.min(100, Math.round((cur/max)*100)) : 0 }
function fmtMoney(n){ return `$${Number(n||0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` }

async function load(){
  try { user.value = JSON.parse(localStorage.getItem('nc_user')||'null') } catch {}
  if (!user.value?._id) return
  try {
    await store.loadByUser(user.value._id)
  } catch (e) {
    if (e?.response?.status === 404) {
      router.push('/auth/create-player')
    }
  }
}

async function doDev(path, amount){
  devMsg.value = ''
  try {
    await api.post(`/dev/${path}`, { userId: user.value?._id, amount: Number(amount) })
    await load()
    devMsgOk.value = true
    devMsg.value = 'Done.'
  } catch (e) {
    devMsgOk.value = false
    devMsg.value = e?.response?.data?.message || e?.message || 'Error'
  }
}

onMounted(load)
</script>

<style scoped>
/* Styling comes from global layout.css */
</style>
