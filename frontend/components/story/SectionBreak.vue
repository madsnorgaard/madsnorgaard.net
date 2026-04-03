<template>
  <div class="section-break">
    <hr class="section-break__rule" />
    <span v-if="number" class="section-break__number">{{ number }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  number: string
}>()
</script>

<style scoped>
.section-break {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin: 3rem auto;
  max-width: 42rem;
  width: 100%;
}

.section-break__rule {
  width: 4rem;
  border: none;
  border-top: 2px solid var(--color-border);
}

.section-break__number {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-accent);
  letter-spacing: 0.1em;
}
</style>
