<template>
  <div>
    <Topbar />
    <div class="app-wrap">
      <Sidebar />
      <main class="main-content">
        <div class="content-section">
          <slot />
        </div>
        <AppFooter />
      </main>
    </div>
  </div>
  
</template>

<script setup>
import Topbar from '../components/Topbar.vue'
import Sidebar from '../components/Sidebar.vue'
import AppFooter from '../components/AppFooter.vue'
import '../assets/layout.css'
</script>

<style scoped>
/* Layout styling largely in layout.css */
</style>
