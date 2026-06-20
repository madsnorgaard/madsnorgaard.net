<template>
  <div
    class="sphere-filter"
    role="toolbar"
    aria-label="Filter projects by sphere"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="sphere-filter__chip"
      :class="[
        `sphere-filter__chip--${option.value}`,
        { 'is-active': option.value === modelValue },
      ]"
      :aria-pressed="option.value === modelValue"
      @click="$emit('update:modelValue', option.value)"
    >
      <span class="sphere-filter__label">{{ option.label }}</span>
      <span v-if="option.count !== undefined" class="sphere-filter__count">{{ option.count }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { SphereValue, SphereOption } from '~/types/sphere'

defineProps<{
  modelValue: SphereValue
  options: SphereOption[]
}>()

defineEmits<{
  'update:modelValue': [value: SphereValue]
}>()
</script>

<style scoped>
.sphere-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.sphere-filter__chip {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.45em 0.9em;
  background: transparent;
  border: 1px solid var(--color-border, #2A2A2A);
  color: var(--color-muted, #6B6763);
  cursor: pointer;
  display: inline-flex;
  align-items: baseline;
  gap: 0.5em;
  transition: color 150ms ease, border-color 150ms ease;
}

.sphere-filter__chip:hover {
  color: var(--color-text, #F0EDE6);
  border-color: var(--color-text, #F0EDE6);
}

.sphere-filter__chip:focus-visible {
  outline: 2px solid var(--color-accent, #D0243E);
  outline-offset: 2px;
}

.sphere-filter__chip.is-active {
  color: var(--color-text, #F0EDE6);
  border-color: var(--color-text, #F0EDE6);
}

.sphere-filter__chip--civic.is-active {
  color: var(--color-accent, #D0243E);
  border-color: var(--color-accent, #D0243E);
}

.sphere-filter__count {
  font-size: 0.65rem;
  color: var(--color-muted, #6B6763);
}

.sphere-filter__chip.is-active .sphere-filter__count {
  color: inherit;
}
</style>
