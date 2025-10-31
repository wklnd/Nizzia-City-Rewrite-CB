<template>
  <footer class="footer muted">
    <span>© {{ year }} Nizzia City</span>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear()
</script>

<style scoped>
/* Minimal footer style; layout.css adds base */
</style>
