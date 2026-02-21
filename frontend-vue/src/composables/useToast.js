/* ═══════════════════════════════════════════════════
   useToast() — lightweight global notification system
   
   Usage in any component:
     import { useToast } from '@/composables/useToast'
     const toast = useToast()
     toast.ok('Item purchased!')
     toast.error('Not enough cash')
     toast.warn('Cooldown active')
     toast.info('Market prices updated')
   ═══════════════════════════════════════════════════ */

import { reactive } from 'vue'

/** Shared reactive state (singleton across all consumers) */
const state = reactive({
  items: [],     // { id, type, text, fading }
  nextId: 0,
})

const DURATION = 3500    // visible for 3.5s
const FADE_MS  = 300     // fade-out animation

function push(type, text) {
  const id = ++state.nextId
  state.items.push({ id, type, text, fading: false })

  // Start fade-out, then remove
  setTimeout(() => {
    const it = state.items.find(i => i.id === id)
    if (it) it.fading = true
    setTimeout(() => {
      const idx = state.items.findIndex(i => i.id === id)
      if (idx !== -1) state.items.splice(idx, 1)
    }, FADE_MS)
  }, DURATION)
}

export function useToast() {
  return {
    ok:    (text) => push('ok', text),
    error: (text) => push('error', text),
    warn:  (text) => push('warn', text),
    info:  (text) => push('info', text),
    /** Direct access to the reactive list (used by ToastContainer) */
    items: state.items,
  }
}
