/* ═══════════════════════════════════════════════════
   Shared formatting helpers — import once, use everywhere
   ═══════════════════════════════════════════════════ */

/** $1,234,567 — no decimals */
export function fmtMoney(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

/** 1,234,567 — no decimals */
export function fmtInt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

/** 1,234.56 — two decimals (good for stats) */
export function fmtStat(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Generic toLocaleString — default decimals */
export function fmt(n) {
  return Number(n || 0).toLocaleString()
}

/** 12 Feb 2026, 14:32 */
export function fmtDate(d) {
  try {
    return new Date(d).toLocaleString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

/** 12 Feb 2026 — date only */
export function fmtDateShort(d) {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return '' }
}

/** "3h 24m", "12m 05s", "5s" — human-readable countdown */
export function fmtDuration(ms) {
  if (!ms || ms <= 0) return '0s'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`
  return `${sec}s`
}

/** 12.5% */
export function fmtPct(n) {
  return `${Number(n || 0).toFixed(1)}%`
}
