<template>
  <section class="hof">
    <h2>Hall of Fame</h2>
    <p class="muted">Top players by wealth, battle stats, and work stats.</p>

    <div v-if="loading" class="panel" style="margin-top:12px;">Loading…</div>
    <div v-else-if="error" class="panel" style="margin-top:12px;color:#ff6b6b;">{{ error }}</div>

    <div v-else>
      <div class="panel hof__controls">
        <label>Limit
          <select v-model.number="limit">
            <option :value="10">Top 10</option>
            <option :value="25">Top 25</option>
            <option :value="50">Top 50</option>
          </select>
        </label>
        <label class="hof__checkbox">
          <input type="checkbox" v-model="includeNpc" /> Include NPCs
        </label>
        <button class="btn" @click="load">Apply</button>
      </div>

      <div class="hof__grid">
      <div class="panel">
        <div class="hof__head">💰 Richest</div>
        <ol class="hof__list">
          <li v-for="p in data.richest" :key="'r-'+p.id" class="hof__row">
            <span class="rank">#{{ p.rank }}</span>
            <RouterLink class="name" :to="`/profile/${p.id}`">{{ p.name }}</RouterLink>
            <span class="value">{{ fmtMoney(p.netWorth) }}</span>
          </li>
        </ol>
      </div>

      <div class="panel">
        <div class="hof__head">⚔️ Battle</div>
        <ol class="hof__list">
          <li v-for="p in data.battle" :key="'b-'+p.id" class="hof__row">
            <span class="rank">#{{ p.rank }}</span>
            <RouterLink class="name" :to="`/profile/${p.id}`">{{ p.name }}</RouterLink>
            <span class="value">{{ fmtInt(p.total) }}</span>
          </li>
        </ol>
      </div>

      <div class="panel">
        <div class="hof__head">🏢 Work</div>
        <ol class="hof__list">
          <li v-for="p in data.work" :key="'w-'+p.id" class="hof__row">
            <span class="rank">#{{ p.rank }}</span>
            <RouterLink class="name" :to="`/profile/${p.id}`">{{ p.name }}</RouterLink>
            <span class="value">{{ fmtInt(p.total) }}</span>
          </li>
        </ol>
      </div>
    </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../api/client'

const data = ref({ richest: [], battle: [], work: [] })
const loading = ref(true)
const error = ref('')
const limit = ref(10)
const includeNpc = ref(true)

function fmtInt(n){ return Number(n||0).toLocaleString(undefined, { maximumFractionDigits: 0 }) }
function fmtMoney(n){ return `$${fmtInt(n)}` }

async function load(){
  loading.value = true
  error.value = ''
  try {
    const qs = new URLSearchParams({ limit: String(limit.value), excludeNpc: String(!includeNpc.value) }).toString()
    const res = await api.get(`/hof?${qs}`)
    data.value = res.data || res
  } catch(e){
    error.value = e?.response?.data?.error || e?.message || 'Failed to load Hall of Fame'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.hof__controls { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.hof__controls select { padding: 6px; border-radius: 6px; border: 1px solid #555; background: #2b2b2b; color: #fff; }
.hof__checkbox { display: inline-flex; align-items: center; gap: 6px; }
.hof__grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}
.hof__head { font-weight: 600; margin-bottom: 8px; }
.hof__list { margin: 0; padding-left: 18px; }
.hof__row { display: grid; grid-template-columns: 36px 1fr auto; gap: 8px; align-items: center; padding: 4px 0; }
.rank { color: var(--muted); }
.name { color: var(--text); }
.value { font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }
</style>
