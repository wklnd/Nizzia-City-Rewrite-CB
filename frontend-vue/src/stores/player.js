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
    async loadByUser(userInput) {
      if (!userInput) return null
      this.loading = true
      this.error = ''
      try {
        // Support a variety of inputs: raw ObjectId string, numeric id, JSON string, or object
        const extractUserId = (u) => {
          if (!u) return null
          if (typeof u === 'string') {
            // Try JSON -> object
            try {
              const obj = JSON.parse(u)
              if (obj && (obj._id || obj.id)) return obj._id || obj.id
            } catch {}
            return u
          }
          if (typeof u === 'object') {
            return u._id || u.id || null
          }
          return String(u)
        }
        const uid = extractUserId(userInput)
        if (!uid) throw new Error('Invalid user identifier')
        const res = await api.get(`/player/by-user/${uid}`)
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
