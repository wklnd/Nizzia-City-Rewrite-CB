<template>
  <section>
    <h2>Welcome to Nizzia City</h2>
    <p>What a nice day to create some carnage!</p>

    <InfoGrid class="u-mt-8">
      <InfoBox>
        <template #title>
          <h3>Player Information</h3>
        </template>
        <p>Name: {{ store.player?.name || '—' }}</p>
        <p>Money: {{ money }}</p>
        <p>Level: {{ store.player?.level || 1 }}</p>
        <p>Points: {{ store.player?.points || 0 }}</p>
      </InfoBox>

      <InfoBox>
        <template #title>
          <h3>Vitals</h3>
        </template>
        <p>Energy: {{ eNow }}/{{ eMax }}</p>
        <p>Nerve: {{ nNow }}/{{ nMax }}</p>
        <p>Happy: {{ hNow }}/{{ hMax }}</p>
        <p>HP: {{ hpNow }}/{{ hpMax }}</p>
      </InfoBox>
      <InfoBox>
        <template #title>
          <h3>Property</h3>
        </template>
        <div class="property-card" v-if="homeLoading">
          <div class="property-card__loading">Loading property…</div>
        </div>
        <div class="property-card" v-else-if="homeError">
          <div class="property-card__error">{{ homeError }}</div>
        </div>
        <div class="property-card" v-else>
          <div class="property-card__media">
            <img
              v-if="imageOk && home?.image"
              :src="home.image"
              :alt="home?.name || 'Home'"
              @error="imageOk = false"
            />
            <div v-else class="property-card__placeholder">
              <span>{{ home?.name || home?.id || 'Home' }}</span>
            </div>
          </div>
          <div class="property-card__info">
            <div class="property-card__row">
              <strong class="property-card__name">{{ home?.name }}</strong>
              <span class="property-card__meta">Happiness: {{ home?.happy }} / {{ home?.happyMax }}</span>
            </div>
            <div class="property-card__upgrades">
              <div class="property-card__upgrades-title">Installed upgrades</div>
              <div class="property-card__chips" v-if="installedUpgrades.length">
                <span class="chip chip--ok" v-for="u in installedUpgrades" :key="u.id">{{ u.name }}</span>
              </div>
              <div v-else class="property-card__empty">No upgrades installed yet</div>
            </div>
            <div class="property-card__actions">
              <RouterLink to="/property" class="btn btn--primary">Manage Property</RouterLink>
            </div>
          </div>
        </div>
      </InfoBox>
    </InfoGrid>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import InfoBox from '../components/InfoBox.vue'
import InfoGrid from '../components/InfoGrid.vue'
import { usePlayer } from '../composables/usePlayer'
import { fmtMoney } from '../utils/format'
import api from '../api/client'

const { store, ensurePlayer } = usePlayer()
const money = computed(() => fmtMoney(store.player?.money))
const eNow = computed(() => store.player?.energyStats?.energy ?? 0)
const eMax = computed(() => store.player?.energyStats?.energyMax ?? 0)
const nNow = computed(() => store.player?.nerveStats?.nerve ?? 0)
const nMax = computed(() => store.player?.nerveStats?.nerveMax ?? 0)
const hNow = computed(() => store.player?.happiness?.happy ?? 0)
const hMax = computed(() => store.player?.happiness?.happyMax ?? 0)
const hpNow = computed(() => typeof store.player?.health === 'number' ? store.player.health : 0)
const hpMax = 100

// Property (Home) panel state
const home = ref(null)
const homeLoading = ref(false)
const homeError = ref('')
const imageOk = ref(true)

function humanizeUpgradeId(id){
  if (!id) return ''
  return String(id).split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')
}

const installedUpgrades = computed(() => {
  const up = home.value?.upgrades || {}
  const names = home.value?.upgradeNames || {}
  return Object.entries(up)
    .filter(([, level]) => Number(level || 0) > 0)
    .map(([id]) => ({ id, name: names[id] || humanizeUpgradeId(id) }))
})

async function loadHome() {
  if (!store.player?.user) return
  homeLoading.value = true
  homeError.value = ''
  imageOk.value = true
  try {
    const { data } = await api.get('/realestate/home')
    home.value = data
  } catch (e) {
    homeError.value = e?.response?.data?.error || e?.message || 'Failed to load property'
  } finally {
    homeLoading.value = false
  }
}

onMounted(() => {
  loadHome()
})

// Reload home if player changes (e.g., after actions that affect happiness)
watch(() => store.player?.home, () => loadHome())
</script>

<style scoped>
.property-card { display: flex; flex-direction: column; gap: 10px; }
.property-card__media { width: 100%; aspect-ratio: 16/9; border-radius: 2px; overflow: hidden; border: 1px solid var(--border); background: var(--bg-alt); }
.property-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.property-card__placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--muted); }
.property-card__info { display: flex; flex-direction: column; gap: 6px; }
.property-card__row { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; }
.property-card__name { font-size: 13px; font-weight: 600; }
.property-card__meta { font-size: 12px; color: var(--muted); }
.property-card__upgrades-title { font-size: 11px; color: var(--muted); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.03em; }
.property-card__chips { display: flex; flex-wrap: wrap; gap: 4px; }
.property-card__empty { font-size: 12px; color: var(--muted); }
.property-card__actions { margin-top: 6px; }
.property-card__loading, .property-card__error { grid-column: 1 / -1; padding: 10px; color: var(--muted); font-size: 12px; }
</style>
