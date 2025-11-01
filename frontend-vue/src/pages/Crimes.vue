<template>
  <section class="crimes">
    <h2>Crimes</h2>

    <div class="grid">
      <button class="crime-btn" @click="openSearchForCash">
        <span>Search for Cash</span>
      </button>
      <button class="crime-btn" disabled title="Coming soon">Bootlegging</button>
      <button class="crime-btn" disabled title="Coming soon">Pickpocket</button>
      <button class="crime-btn" disabled title="Coming soon">Burglary</button>
      <button class="crime-btn" disabled title="Coming soon">Car Theft</button>
      <button class="crime-btn" disabled title="Coming soon">Hustling</button>
      <button class="crime-btn" disabled title="Coming soon">Mugging</button>
      <button class="crime-btn" disabled title="Coming soon">Smuggling</button>
      <button class="crime-btn" disabled title="Coming soon">Cyber Crime</button>
      <button class="crime-btn" disabled title="Coming soon">Vandalism</button>
      <button class="crime-btn" disabled title="Coming soon">Arson</button>
      <button class="crime-btn" disabled title="Coming soon">Heist</button>
      <button class="crime-btn" disabled title="Coming soon">Fraud</button>
      <button class="crime-btn" disabled title="Coming soon">Extortion</button>
      <button class="crime-btn" disabled title="Coming soon">Counterfeit</button>
      <button class="crime-btn" disabled title="Coming soon">Blackmail</button>
    </div>

    <!-- Dedicated crime pages handle details -->
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../stores/player'

const store = usePlayerStore()
const router = useRouter()
const busy = ref(false)
function fmt(n){ return Number(n||0).toLocaleString() }

async function openSearchForCash(){
  await router.push({ name: 'crime-search-for-cash' })
}
</script>

<style scoped>
.crimes { max-width: 800px; margin: 24px auto; padding: 0 16px; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.crime-btn { background: var(--panel); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 14px 10px; cursor: pointer; text-align: center; }
.crime-btn:disabled { opacity: .6; cursor: not-allowed }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; color: var(--text); }
.row { display:flex; gap: 16px; margin: 8px 0; color: var(--muted) }
.stat { font-size: 12px; }
button { padding: 8px 12px; background: var(--accent); color: #fff; border: 1px solid transparent; border-radius: 8px; cursor:pointer }
button:disabled { opacity: .6; cursor: not-allowed }
.result { margin-top: 10px; font-size: 14px; }
.error { color: #ff5f73; }
</style>
