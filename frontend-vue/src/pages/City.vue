<template>
  <section class="city">
    <h2>City</h2>
    <p class="muted">Pick a destination on the map or use the list below.</p>

    <div class="city__wrap panel">
      <div class="city__map">
        <button
          v-for="poi in pois"
          :key="poi.id"
          class="poi"
          :style="{ left: poi.x + '%', top: poi.y + '%'}"
          :title="poi.name"
          @click="go(poi)"
          :disabled="poi.comingSoon"
        >
          <span class="poi__icon" aria-hidden="true">{{ poi.icon }}</span>
          <span class="poi__name">{{ poi.name }}</span>
          <span v-if="poi.comingSoon" class="poi__soon">Soon</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import '../assets/city.css'

const router = useRouter()

const pois = [
  { id: 'gym', name: 'Gym', icon: '💪', x: 20, y: 74, route: '/gym' },
  { id: 'casino', name: 'Casino', icon: '🎰', x: 38, y: 34, route: '/casino' },
  { id: 'crimes', name: 'Crimes', icon: '🕵️', x: 68, y: 38, route: '/crimes' },
  { id: 'bank', name: 'Bank', icon: '🏦', x: 60, y: 26, route: '/bank' },
  { id: 'stocks', name: 'Stock Exchange', icon: '📈', x: 80, y: 56, route: '/stocks' },
  { id: 'job', name: 'Job Center', icon: '🏢', x: 52, y: 72, route: '/job' },
  { id: 'hof', name: 'Hall of Fame', icon: '🏆', x: 32, y: 16, route: '/hall-of-fame' },
  { id: 'real-estate', name: 'Real Estate', icon: '🏠', x: 72, y: 82, route: '/real-estate' },
  { id: 'pets', name: 'Pet Store', icon: '🐾', x: 14, y: 64, route: '/pets' },
  { id: 'market', name: 'Market', icon: '🛒', x: 8, y: 42, route: '/market' },

  // Shops scroll to sections below
  { id: 'shop-candy', name: 'Candy Shop', icon: '🍬', x: 24, y: 44, sectionId: '#shop-candy' },
  { id: 'shop-weapons', name: 'Weapons', icon: '🔫', x: 46, y: 20, sectionId: '#shop-weapons' },
  { id: 'shop-bnb', name: 'Bits & Bobs', icon: '🧰', x: 86, y: 76, sectionId: '#shop-bnb' },

  // Not yet implemented destinations
  { id: 'airport', name: 'Airport', icon: '✈️', x: 10, y: 18, comingSoon: true },
]

const linkablePois = computed(() => pois.filter(p => p.route && !p.comingSoon))

const descriptions = {
  gym: 'Train your battle stats and get stronger.',
  casino: 'Try your luck on the wheel and games.',
  crimes: 'Plan and execute crimes for cash and XP.',
  bank: 'Manage deposits and interest payouts.',
  stocks: 'Buy low, sell high; watch the ticker.',
  job: 'Find a job, gain points, and rank up.',
  hof: 'See top players and recent milestones.',
  'real-estate': 'Upgrade your home to boost stats.',
  market: 'Player-to-player marketplace for items.',
}

function go(poi){
  if (poi.comingSoon) return
  if (poi.route) return router.push(poi.route)
  if (poi.sectionId) {
    const el = document.querySelector(poi.sectionId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<style scoped>
.city h2 { margin-top: 0; }
</style>
