<template>
  <footer class="footer muted">
    <span>© {{ year }} Nizzia City - Made with hate by Oscar</span>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear()
</script>

<style scoped>
/* Minimal footer style; layout.css adds base */
</style>
