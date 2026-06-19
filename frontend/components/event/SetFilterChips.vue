<template>
  <nav class="chips" aria-label="Filter by night">
    <button
      class="chip"
      :class="{ 'chip--on': !activeSlug }"
      type="button"
      @click="select(null)"
    >All nights</button>

    <button
      v-for="set in sets"
      :key="set.slug"
      class="chip"
      :class="{ 'chip--on': activeSlug === set.slug }"
      type="button"
      @click="select(set.slug)"
    >
      {{ set.name }}
      <span class="chip__count">{{ set.count }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import type { EventSet } from '~/types/event'

defineProps<{
  sets: EventSet[]
  activeSlug: string | null
}>()

const emit = defineEmits<{ (e: 'select', slug: string | null): void }>()

function select(slug: string | null) {
  emit('select', slug)
}
</script>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  max-width: 70rem;
  margin: 0 auto;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  transition: color 150ms ease, border-color 150ms ease, background 150ms ease;
}

.chip:hover { color: var(--color-text); border-color: var(--color-muted); }

.chip--on {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-dim);
}

.chip__count {
  font-size: 0.6rem;
  color: var(--color-border);
}
.chip--on .chip__count { color: var(--color-accent); }
</style>
