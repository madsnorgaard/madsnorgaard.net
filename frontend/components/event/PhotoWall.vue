<template>
  <div class="wall">
    <!-- Switching nights: a spinner anchored near the top of the wall so the
         user gets immediate feedback while the new set's first page loads. Kept
         outside the dimmed grid so it stays fully visible. -->
    <div v-if="busy" class="wall__busy" role="status" aria-live="polite">
      <span class="wall__spinner" aria-hidden="true" />
      <span class="wall__busy-label">loading photographs…</span>
    </div>

    <div ref="gridEl" class="wall__grid" :class="{ 'wall__grid--busy': busy }">
      <EventWallSection
        v-for="section in sections"
        :key="section.key"
        :rows="section.rows"
        :est-height="section.estHeight"
        :morph-id="morphId"
        :darkroom="darkroom"
        @open="$emit('open', $event)"
      />
    </div>

    <!-- Infinite-scroll sentinel -->
    <div ref="sentinel" class="wall__sentinel" />

    <p v-if="loading" class="wall__status">loading more…</p>
    <p v-else-if="!hasMore && photos.length" class="wall__status">
      {{ photos.length }} photographs · that's all of them
    </p>
    <p v-else-if="!photos.length && !loading" class="wall__status">
      No photographs in this set yet.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { EventPhoto, WallRow } from '~/types/event'

const GAP = 4 // px gap between tiles and rows (matches WallSection CSS)
const ROWS_PER_SECTION = 8 // windowing granularity (≈ one page of photos)

const props = defineProps<{
  photos: EventPhoto[]
  hasMore: boolean
  loading: boolean
  busy?: boolean
  darkroom?: boolean
  morphId?: number | null
}>()

const emit = defineEmits<{
  (e: 'open', index: number): void
  (e: 'load-more'): void
}>()

// Measure the live wall width so the justified layout fills it exactly.
const gridEl = ref<HTMLElement | null>(null)
const containerW = ref(1200) // SSR / first-paint default; re-measured on mount

useResizeObserver(gridEl, (entries) => {
  const w = entries[0]?.contentRect.width ?? 0
  if (w) containerW.value = w
})
onMounted(() => {
  const w = gridEl.value?.clientWidth ?? 0
  if (w) containerW.value = w
})

// Base row height by breakpoint. The justified algorithm scales each row around
// its target so rows always reach full width.
function baseHeight(w: number): number {
  return w <= 540 ? 165 : w <= 1024 ? 205 : 255
}

// Designed rhythm: most rows sit at the base height; periodic rows aim taller,
// which packs fewer (so bigger) photos into them - "feature" bands that give the
// wall a dynamic cadence even when every photo is the same shape. Deterministic
// per row index, so it's stable across re-layout and SSR/client. Length 13 (out
// of step with the section size) keeps the peaks from lining up into stripes.
const RHYTHM = [1, 1, 1, 1.45, 1, 1, 1.25, 1, 1.6, 1, 1, 1.3, 1]
// Feature bands are softened on narrow screens so a row never drops to 1-2 huge
// tiles on a phone.
function rowTarget(base: number, rowIndex: number, narrow: boolean): number {
  const f = RHYTHM[rowIndex % RHYTHM.length]
  return base * (narrow ? 1 + (f - 1) * 0.5 : f)
}

function aspect(p: EventPhoto): number {
  const im = p.images
  return im && im.width && im.height ? im.width / im.height : 1.5
}

// Justified-rows layout: walk photos in order, packing each row until it would
// exceed the container width at that row's target height, then scale the row to
// fit exactly. Preserves strict order, fills full width, leaves no gaps. The
// final (incomplete) row keeps its natural target height, left-aligned.
const layout = computed<WallRow[]>(() => {
  const W = containerW.value
  const base = baseHeight(W)
  const narrow = W <= 540
  const rows: WallRow[] = []
  let cur: { photo: EventPhoto; ar: number; index: number }[] = []
  let arSum = 0
  let rowIndex = 0
  let target = rowTarget(base, rowIndex, narrow)

  const flush = (stretch: boolean) => {
    if (!cur.length) return
    // Justify to the exact width (stretch); the trailing row keeps its target.
    const h = stretch ? (W - (cur.length - 1) * GAP) / arSum : target
    rows.push({
      height: Math.round(h),
      items: cur.map((c) => ({ photo: c.photo, index: c.index, width: Math.round(c.ar * h) })),
    })
    cur = []
    arSum = 0
    rowIndex += 1
    target = rowTarget(base, rowIndex, narrow)
  }

  props.photos.forEach((photo, index) => {
    const ar = aspect(photo)
    cur.push({ photo, ar, index })
    arSum += ar
    // A taller target fills the width with fewer (bigger) photos -> feature band.
    if (arSum * target + (cur.length - 1) * GAP >= W) flush(true)
  })
  flush(false)
  return rows
})

// Chunk rows into windowable sections, each with a deterministic height estimate
// so off-screen blocks reserve the right space before they are ever measured.
const sections = computed(() => {
  const rows = layout.value
  const out: { key: number; rows: WallRow[]; estHeight: number }[] = []
  for (let i = 0; i < rows.length; i += ROWS_PER_SECTION) {
    const slice = rows.slice(i, i + ROWS_PER_SECTION)
    const estHeight = slice.reduce((s, r) => s + r.height + GAP, 0)
    out.push({ key: slice[0]?.items[0]?.index ?? i, rows: slice, estHeight })
  }
  return out
})

const sentinel = ref<HTMLElement | null>(null)

useIntersectionObserver(
  sentinel,
  ([entry]) => {
    if (entry.isIntersecting && props.hasMore && !props.loading) {
      emit('load-more')
    }
  },
  { rootMargin: '800px 0px' }
)
</script>

<style scoped>
.wall {
  max-width: 100%;
  padding: 0 2px 4rem;
  position: relative;
}

/* Dim the outgoing set while the new one loads (badge sits outside this). */
.wall__grid--busy {
  opacity: 0.35;
  transition: opacity 150ms ease;
  pointer-events: none;
}

.wall__busy {
  position: sticky;
  top: 1rem;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin: 1.5rem auto;
  width: fit-content;
  padding: 0.55rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-muted);
}

.wall__spinner {
  width: 0.95rem;
  height: 0.95rem;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: wall-spin 700ms linear infinite;
}

@keyframes wall-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .wall__spinner { animation-duration: 1800ms; }
}

.wall__sentinel {
  height: 1px;
}

.wall__status {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  color: var(--color-muted);
  padding: 2.5rem 1rem;
}
</style>
