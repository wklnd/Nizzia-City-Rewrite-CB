<!-- Info box, for displaying player stats, information, achievemnts etc-->
 <!-- each box have a title, and then a table under it, with 2 fields-->
  <!-- The title is provided via a slot, and the content can be customized as well 
   -->

<template>
  <div class="info-box">
    <div class="info-box__header">
      <div class="info-box__title">
        <slot name="title">
          <h3>Info Box</h3>
        </slot>
      </div>
      <div class="info-box__actions">
        <slot name="actions" />
      </div>
    </div>
    <div class="info-box__content">
      <slot>
        <p>No content provided.</p>
      </slot>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.info-box {
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 12px;
}
.info-box__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 8px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}
.info-box__title h3 { margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; }
.info-box__actions :deep(button),
.info-box__actions :deep(a) {
  font-size: 11px;
}
.info-box__content p { margin: 4px 0; font-size: 12px; }
</style>