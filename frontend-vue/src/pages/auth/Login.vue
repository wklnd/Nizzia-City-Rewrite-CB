<template>
  <section class="panel" style="max-width:420px;margin:40px auto;">
    <h2>Log in</h2>
    <form @submit.prevent="onSubmit" class="u-col u-gap-12">
      <label>Email
        <input v-model="email" type="email" required placeholder="you@example.com" />
      </label>
      <label>Password
        <input v-model="password" type="password" required />
      </label>
      <button class="btn" :disabled="busy">{{ busy ? 'Logging in…' : 'Log in' }}</button>
      <p class="muted" v-if="err">{{ err }}</p>
    </form>

    <p class="muted" style="margin-top:12px;">
      Don't have an account?
      <RouterLink to="/auth/register">Create one</RouterLink>
    </p>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import api from '../../api/client'

const email = ref('')
const password = ref('')
const err = ref('')
const busy = ref(false)
const router = useRouter()

async function onSubmit(){
  err.value = ''
  busy.value = true
  try {
    const res = await api.post('/auth/login', { email: email.value, password: password.value })
    const data = res.data || res
    try {
      localStorage.setItem('nc_token', data.token)
      localStorage.setItem('nc_user', JSON.stringify(data.user))
    } catch {}
    // After login, check if player exists; if not, go to create-player
    try {
      const chk = await api.get(`/player/by-user/${data.user._id}`)
      if (!chk?.data && !chk?._id) throw new Error('no player')
      const next = (router.currentRoute.value.query?.next) || '/'
      router.push(String(next))
    } catch {
      router.push('/auth/create-player')
    }
  } catch (e) {
    err.value = e?.response?.data?.error || e?.message || 'Login failed'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
input { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #555; background: #2b2b2b; color: #fff; }
label { display:block; font-size: 12px; opacity: 0.85; }
.btn { padding: 10px 12px; border-radius: 6px; border: 1px solid #3d8b40; background: #4caf50; color: #fff; cursor: pointer; }
</style>
