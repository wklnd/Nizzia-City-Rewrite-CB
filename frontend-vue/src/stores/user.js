import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: null,
    profile: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    setToken(token) {
      this.token = token
      if (typeof localStorage !== 'undefined') {
        if (token) localStorage.setItem('nc_token', token)
        else localStorage.removeItem('nc_token')
      }
    },
    loadToken() {
      if (typeof localStorage !== 'undefined') {
        this.token = localStorage.getItem('nc_token')
      }
      return this.token
    },
    setProfile(profile) {
      this.profile = profile
    },
    logout() {
      this.setToken(null)
      this.profile = null
    },
  },
})
