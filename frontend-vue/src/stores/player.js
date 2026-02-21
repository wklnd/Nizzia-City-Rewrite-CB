import { defineStore } from 'pinia'
import api from '../api/client'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    player: null,
    loading: false,
    error: '',
  }),
  actions: {
    setPlayer(p) {
      this.player = p
      try { localStorage.setItem('nc_player', JSON.stringify(p)) } catch {}
    },
    /** Patch specific fields without a full reload (for snappy post-action updates) */
    mergePartial(data) {
      if (!this.player || !data) return
      for (const key of Object.keys(data)) {
        this.player[key] = data[key]
      }
      try { localStorage.setItem('nc_player', JSON.stringify(this.player)) } catch {}
    },
    async loadByUser() {
      this.loading = true
      this.error = ''
      try {
        const res = await api.get('/player/me')
        const p = res.data || res
        this.setPlayer(p)
        return p
      } catch (e) {
        this.error = e?.response?.data?.error || e?.message || 'Failed to load player'
        throw e
      } finally {
        this.loading = false
      }
    },
  },
})
