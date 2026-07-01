<template>
  <div v-if="points.length" class="era">
    <div class="era__track">
      <div class="era__line" />

      <!-- year ticks -->
      <span
        v-for="yr in years"
        :key="'y' + yr.year"
        class="era__year"
        :style="{ left: yr.pct + '%' }"
      >{{ yr.year }}</span>

      <!-- one dot per night -->
      <button
        v-for="p in points"
        :key="p.slug"
        class="era__dot"
        :class="{ 'era__dot--on': p.slug === activeSlug }"
        type="button"
        :style="{ left: p.pct + '%' }"
        :title="p.label"
        :aria-label="p.label"
        @click="$emit('select', p.slug)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EventSet } from '~/types/event'

const props = defineProps<{
  sets: EventSet[]
  activeSlug: string | null
}>()

defineEmits<{ (e: 'select', slug: string): void }>()

interface Point { slug: string; label: string; t: number; pct: number }

const parsed = computed(() =>
  props.sets
    .map((s) => {
      const m = s.name.match(/(\d{4})-(\d{2})-(\d{2})/)
      if (!m) return null
      const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      return { slug: s.slug, label: s.name, t }
    })
    .filter((x): x is { slug: string; label: string; t: number } => !!x)
    .sort((a, b) => a.t - b.t)
)

const range = computed(() => {
  const ts = parsed.value.map((p) => p.t)
  const min = Math.min(...ts)
  const max = Math.max(...ts)
  return { min, max, span: Math.max(1, max - min) }
})

const points = computed<Point[]>(() =>
  parsed.value.map((p) => ({
    ...p,
    pct: ((p.t - range.value.min) / range.value.span) * 100,
  }))
)

const years = computed(() => {
  if (!parsed.value.length) return []
  const startY = new Date(range.value.min).getUTCFullYear()
  const endY = new Date(range.value.max).getUTCFullYear()
  const out: { year: number; pct: number }[] = []
  for (let y = startY; y <= endY; y++) {
    const t = Date.UTC(y, 0, 1)
    const pct = Math.max(0, Math.min(100, ((t - range.value.min) / range.value.span) * 100))
    out.push({ year: y, pct })
  }
  return out
})
</script>

<style scoped>
.era {
  max-width: 70rem;
  margin: 0 auto;
  padding: 0.5rem 2rem 1.75rem;
}

.era__track {
  position: relative;
  height: 2.5rem;
}

.era__line {
  position: absolute;
  top: 0.5rem;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--color-border);
}

.era__year {
  position: absolute;
  top: 1.1rem;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: var(--color-muted);
  opacity: 0.6;
}

.era__dot {
  position: absolute;
  top: 0.5rem;
  transform: translate(-50%, -50%);
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid var(--color-muted);
  background: var(--color-bg);
  cursor: pointer;
  padding: 0;
  transition: all 150ms ease;
}
.era__dot:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-dim);
  transform: translate(-50%, -50%) scale(1.4);
}
.era__dot--on {
  border-color: var(--color-accent);
  background: var(--color-accent);
  box-shadow: 0 0 8px rgba(208, 36, 62, 0.7);
}
</style>
