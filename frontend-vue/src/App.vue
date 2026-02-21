<template>
  <component :is="hideChrome ? 'div' : AppLayout">
    <router-view />
  </component>
  <ToastContainer />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from './layouts/AppLayout.vue'
import ToastContainer from './components/ToastContainer.vue'

const route = useRoute()
const hideChrome = computed(() => !!route.meta?.hideChrome)
</script>
