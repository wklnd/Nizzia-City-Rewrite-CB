import axios from 'axios'

// Base URL can be overridden by localStorage key 'nc_api'; defaults to '/api'
const apiBase = (typeof localStorage !== 'undefined' && localStorage.getItem('nc_api')) || '/api'

const api = axios.create({
  baseURL: apiBase,
  timeout: 10000,
})

// Attach token from localStorage for now (avoids depending on active Pinia during bootstrap)
api.interceptors.request.use((config) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('nc_token') : null
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Optional: auto-clear token on 401
    if (err?.response?.status === 401 && typeof localStorage !== 'undefined') {
      localStorage.removeItem('nc_token')
    }
    return Promise.reject(err)
  }
)

export default api
