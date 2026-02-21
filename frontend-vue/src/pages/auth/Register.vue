<template>
  <section class="panel" style="max-width:420px;margin:40px auto;">
    <h2>Register</h2>
    <form @submit.prevent="onSubmit" class="u-col u-gap-12">
      <label>Name
        <input v-model="name" required placeholder="Your name" />
      </label>
      <label>Email
        <input v-model="email" type="email" required placeholder="you@example.com" />
      </label>
      <label>Password
        <input v-model="password" type="password" required />
      </label>
      <button class="btn" :disabled="busy">{{ busy ? 'Registering…' : 'Register' }}</button>
      <p class="muted" v-if="msg">{{ msg }}</p>
      <p class="muted" v-if="err">{{ err }}</p>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../api/client'

const name = ref('')
const email = ref('')
const password = ref('')
const msg = ref('')
const err = ref('')
const busy = ref(false)
const router = useRouter()

async function onSubmit(){
  err.value = ''
  msg.value = ''
  busy.value = true
  try {
    const res = await api.post('/auth/register', { name: name.value, email: email.value, password: password.value })
    const data = res.data || res
    msg.value = data?.message || 'Registered. You can now log in.'
    setTimeout(() => router.push('/auth/login'), 800)
  } catch (e) {
    err.value = e?.response?.data?.error || e?.message || 'Registration failed'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
input { width: 100%; }
label { display: block; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
.btn { padding: 8px 12px; background: var(--accent); color: #fff; border: 1px solid var(--accent-hover); cursor: pointer; }
.btn:hover { background: var(--accent-hover); }
</style>
