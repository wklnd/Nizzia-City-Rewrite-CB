<template>
  <section class="edu-page">
    <h2>Education</h2>

    <!-- ── Back button when viewing a category ── -->
    <button v-if="selectedCat" class="btn-back" @click="selectedCat = null">← All Categories</button>

    <div v-if="loading" class="muted">Loading…</div>

    <!-- ═══════════════════════════════════════════════ -->
    <!--  Overview: status + category grid              -->
    <!-- ═══════════════════════════════════════════════ -->
    <template v-else-if="!selectedCat">

      <!-- Active course banner -->
      <div v-if="status.activeCourse" class="card active-banner">
        <div class="banner-top">
          <span class="icon">{{ status.activeCourse.categoryIcon }}</span>
          <div>
            <h3>📖 Studying: {{ status.activeCourse.name }}</h3>
            <span class="muted">{{ status.activeCourse.categoryName }}</span>
          </div>
        </div>
        <div class="banner-meta">
          <span>Started {{ fmtDate(status.activeCourse.startedAt) }}</span>
          <span>Finishes {{ fmtDate(status.activeCourse.endsAt) }}</span>
        </div>
        <button :disabled="busy || !isPast(status.activeCourse.endsAt)"
                @click="doComplete" class="u-mt-8">
          {{ isPast(status.activeCourse.endsAt) ? '✅ Complete Course' : '⏳ In Progress…' }}
        </button>
      </div>

      <!-- Progress summary -->
      <div class="card summary-bar">
        <div class="stat-grid">
          <div class="stat-item"><span class="lbl">Courses Done</span><span class="val accent">{{ status.totalCompleted || 0 }} / {{ status.totalCourses || 132 }}</span></div>
          <div class="stat-item"><span class="lbl">Bachelor's</span><span class="val accent">{{ (status.bachelors || []).length }}</span></div>
          <div class="stat-item"><span class="lbl">Manual Labor</span><span class="val">{{ fmt(status.workStats?.manuallabor) }}</span></div>
          <div class="stat-item"><span class="lbl">Intelligence</span><span class="val">{{ fmt(status.workStats?.intelligence) }}</span></div>
          <div class="stat-item"><span class="lbl">Endurance</span><span class="val">{{ fmt(status.workStats?.endurance) }}</span></div>
        </div>
      </div>

      <!-- Bachelors earned -->
      <div v-if="status.bachelors?.length" class="card">
        <h4>🎓 Degrees Earned</h4>
        <div class="degree-list">
          <span v-for="b in status.bachelors" :key="b.id" class="degree-badge">{{ b.name }}</span>
        </div>
      </div>

      <!-- Category grid -->
      <div class="cat-grid">
        <div v-for="cat in categories" :key="cat.id"
             :class="['card', 'cat-card', { 'cat-complete': cat.hasBachelor }]"
             @click="openCategory(cat.id)">
          <div class="cat-top">
            <span class="cat-icon">{{ cat.icon }}</span>
            <div>
              <h3>{{ cat.name }}</h3>
              <span class="muted">{{ cat.completedCourses }}/{{ cat.totalCourses }} courses</span>
            </div>
          </div>
          <!-- Progress bar -->
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: (cat.completedCourses / cat.totalCourses * 100) + '%' }"></div>
          </div>
          <span v-if="cat.hasBachelor" class="badge badge-degree">🎓 {{ cat.bachelorName }}</span>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════ -->
    <!--  Category Detail View                          -->
    <!-- ═══════════════════════════════════════════════ -->
    <template v-else-if="catDetail">
      <div class="cat-detail-header card">
        <span class="icon">{{ catDetail.icon }}</span>
        <div>
          <h3>{{ catDetail.name }}</h3>
          <span class="muted">{{ catDetail.completedCount }}/{{ catDetail.courses.length }} completed</span>
        </div>
        <span v-if="catDetail.bachelor.earned" class="badge badge-degree u-ml-auto">🎓 {{ catDetail.bachelor.name }}</span>
      </div>

      <!-- Bachelor info -->
      <div class="card bachelor-info" v-if="!catDetail.bachelor.earned">
        <h4>🎓 Bachelor: {{ catDetail.bachelor.name }}</h4>
        <p class="muted">Complete all {{ catDetail.courses.length }} courses to earn this degree.</p>
        <div class="stat-grid" v-if="catDetail.bachelor.rewards">
          <div v-if="catDetail.bachelor.rewards.manuallabor" class="stat-item"><span class="lbl">+ML</span><span class="val">{{ catDetail.bachelor.rewards.manuallabor }}</span></div>
          <div v-if="catDetail.bachelor.rewards.intelligence" class="stat-item"><span class="lbl">+INT</span><span class="val">{{ catDetail.bachelor.rewards.intelligence }}</span></div>
          <div v-if="catDetail.bachelor.rewards.endurance" class="stat-item"><span class="lbl">+END</span><span class="val">{{ catDetail.bachelor.rewards.endurance }}</span></div>
        </div>
        <p v-if="catDetail.bachelor.passive" class="muted u-mt-4">
          Passive: {{ catDetail.bachelor.passive.stat }} ×{{ catDetail.bachelor.passive.multiplier }}
        </p>
        <p v-if="catDetail.bachelor.unlocks" class="muted">Unlocks: {{ catDetail.bachelor.unlocks }}</p>
      </div>

      <!-- Tier sections -->
      <div v-for="tier in tiers" :key="tier.key" class="tier-section">
        <h4 class="tier-heading">{{ tier.label }}</h4>
        <div v-for="c in tierCourses(tier.key)" :key="c.id"
             :class="['card', 'course-card', { done: c.completed, active: c.active }]">
          <div class="course-top">
            <div>
              <h3>{{ c.name }}
                <span v-if="c.completed" class="badge badge-ok">✓</span>
                <span v-else-if="c.active" class="badge badge-active">⏳</span>
              </h3>
              <p class="muted">{{ c.description }}</p>
            </div>
          </div>
          <div class="stat-grid u-mt-4">
            <div class="stat-item"><span class="lbl">Duration</span><span class="val">{{ c.durationDays }}d</span></div>
            <div class="stat-item"><span class="lbl">Cost</span><span class="val">${{ fmt(c.cost) }}</span></div>
            <div v-if="c.rewards?.manuallabor" class="stat-item"><span class="lbl">+ML</span><span class="val ok">{{ c.rewards.manuallabor }}</span></div>
            <div v-if="c.rewards?.intelligence" class="stat-item"><span class="lbl">+INT</span><span class="val ok">{{ c.rewards.intelligence }}</span></div>
            <div v-if="c.rewards?.endurance" class="stat-item"><span class="lbl">+END</span><span class="val ok">{{ c.rewards.endurance }}</span></div>
          </div>
          <!-- Prereqs -->
          <div v-if="c.prereqs?.length" class="prereqs u-mt-4">
            <span class="muted">Requires: {{ prereqNames(c.prereqs).join(', ') }}</span>
          </div>
          <!-- Actions -->
          <div class="actions u-mt-4" v-if="!c.completed">
            <template v-if="c.active">
              <button :disabled="busy || !isPast(c.endsAt)" @click="doComplete">
                {{ isPast(c.endsAt) ? '✅ Complete' : 'Finishes ' + fmtDate(c.endsAt) }}
              </button>
            </template>
            <template v-else-if="c.prereqsMet && !hasActiveCourse">
              <button :disabled="busy" @click="doEnroll(c.id)">Enroll — ${{ fmt(c.cost) }}</button>
            </template>
            <span v-else-if="!c.prereqsMet" class="text-warn">⚠ Prerequisites not met</span>
            <span v-else class="muted">Finish current course first</span>
          </div>
        </div>
      </div>
    </template>

  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '../api/client'
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'
import { fmt } from '../utils/format'

const { store, ensurePlayer } = usePlayer()
const toast = useToast()

const loading = ref(true)
const busy    = ref(false)

// Data
const status      = ref({})
const categories  = ref([])
const selectedCat = ref(null)
const catDetail   = ref(null)

const tiers = [
  { key: 'basic',        label: '📗 Basic (1–4)' },
  { key: 'intermediate', label: '📘 Intermediate (5–8)' },
  { key: 'advanced',     label: '📕 Advanced (9–11)' },
]

const hasActiveCourse = computed(() => !!status.value.activeCourse)
const tierCourses = key => (catDetail.value?.courses || []).filter(c => c.tier === key)

function prereqNames(prereqIds) {
  if (!catDetail.value) return prereqIds
  const lookup = Object.fromEntries((catDetail.value.courses || []).map(c => [c.id, c.name]))
  return prereqIds.map(id => lookup[id] || id)
}

const fmtDate = d => d ? new Date(d).toLocaleString() : ''
const isPast  = d => d ? new Date(d).getTime() <= Date.now() : true

let refreshTimer = null

async function loadOverview() {
  loading.value = true
  try {
    const [s, cats] = await Promise.all([api.get('/education/status'), api.get('/education/categories')])
    status.value = s.data; categories.value = cats.data
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Load failed') }
  loading.value = false
}

async function openCategory(catId) {
  loading.value = true; selectedCat.value = catId
  try { const { data } = await api.get(`/education/categories/${catId}`); catDetail.value = data }
  catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed') }
  loading.value = false
}

async function refreshCategoryAndStatus() {
  try {
    const [s, detail] = await Promise.all([
      api.get('/education/status'),
      selectedCat.value ? api.get(`/education/categories/${selectedCat.value}`) : Promise.resolve(null),
    ])
    status.value = s.data
    if (detail) catDetail.value = detail.data
    const cats = await api.get('/education/categories')
    categories.value = cats.data
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed') }
}

async function doEnroll(courseId) {
  busy.value = true
  try {
    const { data } = await api.post('/education/enroll', { courseId })
    toast.ok(`Enrolled in ${data.name}! Finishes ${fmtDate(data.endsAt)}`)
    await refreshCategoryAndStatus()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed') }
  busy.value = false
}

async function doComplete() {
  busy.value = true
  try {
    const { data } = await api.post('/education/complete')
    const rw = Object.entries(data.rewards || {}).filter(([,v]) => v).map(([k,v]) => `${k} +${v}`).join(', ')
    let msg = `Completed ${data.name}! ${rw}`
    if (data.bachelorEarned) msg += ` 🎓 Bachelor's earned: ${data.bachelorName}!`
    toast.ok(msg)
    await refreshCategoryAndStatus()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed') }
  busy.value = false
}

onMounted(async () => {
  await ensurePlayer()
  await loadOverview()
  refreshTimer = setInterval(() => { if (status.value.activeCourse) loadOverview() }, 30000)
})
onUnmounted(() => { if (refreshTimer) clearInterval(refreshTimer) })
</script>

<style scoped>
.edu-page { max-width: 860px; }

/* Back button */
.btn-back { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 4px 12px; cursor: pointer; margin-bottom: 10px; font-size: .8rem; }
.btn-back:hover { color: var(--accent); border-color: var(--accent); }

/* Messages */
.msg { padding: 6px 10px; border-radius: 2px; margin-bottom: 8px; font-size: .85rem; }
.msg.err { background: rgba(220,50,50,.12); color: var(--danger); border: 1px solid var(--danger); }
.msg.ok  { background: rgba(50,180,50,.12); color: var(--ok);     border: 1px solid var(--ok); }

/* Cards */
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 2px; padding: 14px; margin-bottom: 10px; color: var(--text); }
.card h3 { margin: 0 0 4px; font-size: 1rem; }
.card h4 { margin: 0 0 6px; font-size: .9rem; color: var(--text-strong); }

/* Active course banner */
.active-banner { border-color: var(--accent); }
.banner-top { display: flex; align-items: center; gap: 10px; }
.banner-meta { display: flex; gap: 16px; font-size: .8rem; color: var(--muted); margin-top: 6px; }
.icon { font-size: 1.5rem; }

/* Summary bar */
.summary-bar { margin-bottom: 14px; }
.stat-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.stat-item { display: flex; flex-direction: column; min-width: 80px; }
.stat-item .lbl { font-size: .7rem; text-transform: uppercase; color: var(--muted); letter-spacing: .5px; }
.stat-item .val { font-size: .95rem; font-weight: 600; }

/* Degrees */
.degree-list { display: flex; flex-wrap: wrap; gap: 6px; }
.degree-badge { background: rgba(255,215,0,.12); border: 1px solid rgba(255,215,0,.35); padding: 3px 10px; font-size: .8rem; border-radius: 2px; }

/* Category grid */
.cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; margin-top: 4px; }
.cat-card { cursor: pointer; transition: border-color .15s; }
.cat-card:hover { border-color: var(--accent); }
.cat-complete { border-color: var(--ok); }
.cat-top { display: flex; align-items: center; gap: 10px; }
.cat-icon { font-size: 1.6rem; }

/* Progress bar */
.progress-track { height: 6px; background: var(--border); border-radius: 3px; margin-top: 8px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width .3s; min-width: 0; }
.cat-complete .progress-fill { background: var(--ok); }

/* Badges */
.badge { font-size: .7rem; padding: 2px 6px; border-radius: 2px; display: inline-block; margin-left: 6px; }
.badge-ok { background: var(--ok); color: #000; }
.badge-active { background: var(--accent); color: #000; }
.badge-degree { background: rgba(255,215,0,.2); color: #ffd700; border: 1px solid rgba(255,215,0,.35); margin-top: 6px; }

/* Category detail header */
.cat-detail-header { display: flex; align-items: center; gap: 10px; }
.u-ml-auto { margin-left: auto; }

/* Bachelor info */
.bachelor-info { border: 1px dashed var(--border); background: rgba(255,215,0,.03); }

/* Tier sections */
.tier-section { margin-top: 16px; }
.tier-heading { font-size: .85rem; text-transform: uppercase; letter-spacing: .8px; color: var(--muted); margin: 0 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--border); }

/* Course cards */
.course-card { margin-bottom: 8px; }
.course-card.done { border-color: var(--ok); opacity: .65; }
.course-card.active { border-color: var(--accent); }
.course-top h3 { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.prereqs { font-size: .8rem; }

/* Actions */
.actions { display: flex; gap: 6px; flex-wrap: wrap; }
.val.ok { color: var(--ok); }
.val.accent { color: var(--accent); }

/* Utilities */
.u-mt-4 { margin-top: 4px; }
.u-mt-8 { margin-top: 8px; }
</style>
