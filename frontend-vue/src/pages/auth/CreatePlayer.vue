<template>
  <section class="panel" style="max-width:480px;margin:40px auto;">
    <h2>Create Player</h2>
    <form @submit.prevent="onSubmit" class="u-col u-gap-12">
      <label>Name
        <input v-model="name" required placeholder="Player name" />
      </label>
      <label>Gender
        <select v-model="gender" required>
          <option disabled value="">Select…</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Enby">Enby</option>
        </select>
      </label>
      <button class="btn" :disabled="busy">{{ busy ? 'Creating…' : 'Create' }}</button>
      <p class="muted" v-if="err">{{ err }}</p>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../api/client'

const name = ref('')
const gender = ref('')
const err = ref('')
const busy = ref(false)
const router = useRouter()

async function onSubmit(){
  err.value = ''
  busy.value = true
  try {
    const user = JSON.parse(localStorage.getItem('nc_user')||'null')
    if (!user?._id) throw new Error('No user in session. Log in first.')
    const res = await api.post('/player/create', { name: name.value, gender: gender.value, userId: user._id })
    const p = res.data || res
    try { localStorage.setItem('nc_player', JSON.stringify(p)) } catch {}
    router.push('/')
  } catch (e) {
    err.value = e?.response?.data?.error || e?.message || 'Failed to create player'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
input, select { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #555; background: #2b2b2b; color: #fff; }
label { display:block; font-size: 12px; opacity: 0.85; }
.btn { padding: 10px 12px; border-radius: 6px; border: 1px solid #3d8b40; background: #4caf50; color: #fff; cursor: pointer; }
</style>
