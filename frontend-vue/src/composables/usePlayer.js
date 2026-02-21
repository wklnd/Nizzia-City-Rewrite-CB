/* ═══════════════════════════════════════════════════
   usePlayer() — shared player bootstrap & helpers
   ═══════════════════════════════════════════════════ */

import { usePlayerStore } from '../stores/player'

/**
 * Returns { store, ensurePlayer, reloadPlayer }.
 * Call `await ensurePlayer()` in your onMounted — it does the right thing.
 */
export function usePlayer() {
  const store = usePlayerStore()

  /** Make sure the player store is hydrated. Safe to call repeatedly. */
  async function ensurePlayer() {
    // Already loaded?
    if (store.player?.user) return store.player

    // Try localStorage cache first
    try {
      const cached = JSON.parse(localStorage.getItem('nc_player') || 'null')
      if (cached?.user) { store.setPlayer(cached); return cached }
    } catch { /* ignore */ }

    // Fall back to API
    return await store.loadByUser()
  }

  /**
   * Reload player from API (e.g. after an action that changes stats).
   * Returns the fresh player object.
   */
  async function reloadPlayer() {
    return await store.loadByUser()
  }

  return { store, ensurePlayer, reloadPlayer }
}
