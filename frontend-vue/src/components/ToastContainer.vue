<template>
  <Teleport to="body">
    <div class="toast-stack" v-if="items.length">
      <div
        v-for="t in items"
        :key="t.id"
        class="toast-item"
        :class="['toast--' + t.type, { 'toast--fading': t.fading }]"
      >
        <span class="toast-icon">{{ icon(t.type) }}</span>
        <span class="toast-text">{{ t.text }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '../composables/useToast'
const { items } = useToast()

function icon(type) {
  return { ok: '✓', error: '✕', warn: '⚠', info: 'ℹ' }[type] || ''
}
</script>

<style>
/* ── Toast notifications — global (not scoped) ── */
.toast-stack {
  position: fixed;
  top: 52px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
  max-width: 360px;
}
.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 2px;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.5;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  animation: toast-in 200ms ease-out;
  pointer-events: auto;
}
.toast--fading {
  opacity: 0;
  transform: translateX(20px);
  transition: opacity 300ms, transform 300ms;
}
.toast-icon { font-weight: 700; font-size: 14px; flex-shrink: 0; }

/* Type styles */
.toast--ok    { border-left: 3px solid var(--ok);   }
.toast--ok    .toast-icon { color: var(--ok); }
.toast--error { border-left: 3px solid var(--danger); }
.toast--error .toast-icon { color: var(--danger); }
.toast--warn  { border-left: 3px solid var(--warn);  }
.toast--warn  .toast-icon { color: var(--warn); }
.toast--info  { border-left: 3px solid var(--accent); }
.toast--info  .toast-icon { color: var(--accent); }

@keyframes toast-in {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
</style>
