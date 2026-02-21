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
import { useRouter } from 'vue-router'

const router = useRouter()

async function openSearchForCash(){
  await router.push({ name: 'crime-search-for-cash' })
}
</script>

<style scoped>
.crimes { max-width: 800px; margin: 16px auto; padding: 0 16px; }
.grid { grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 14px; }
.crime-btn { background: var(--panel); color: var(--text); border: 1px solid var(--border); border-radius: 2px; padding: 10px 8px; cursor: pointer; text-align: center; font-size: 12px; transition: border-color 80ms, background 80ms; }
.crime-btn:hover { border-color: var(--accent); background: var(--accent-muted); }
.crime-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
