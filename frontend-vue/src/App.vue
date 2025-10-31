<template>
  <component :is="hideChrome ? 'div' : AppLayout">
    <router-view />
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from './layouts/AppLayout.vue'

const route = useRoute()
const hideChrome = computed(() => !!route.meta?.hideChrome)
</script>

<style scoped>
</style>
