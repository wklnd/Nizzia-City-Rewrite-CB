<template>
  <div class="info-grid">
    <slot />
  </div>
</template>

<script setup>
</script>

<style scoped>
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}
</style>
