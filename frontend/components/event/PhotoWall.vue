<template>
  <div class="wall">
    <!-- Switching nights: a spinner anchored near the top of the wall so the
         user gets immediate feedback while the new set's first page loads. Kept
         outside the dimmed grid so it stays fully visible. -->
    <div v-if="busy" class="wall__busy" role="status" aria-live="polite">
      <span class="wall__spinner" aria-hidden="true" />
      <span class="wall__busy-label">loading photographs…</span>
    </div>

    <div class="wall__grid" :class="{ 'wall__grid--busy': busy }">
      <EventWallSection
        v-for="chunk in chunks"
        :key="chunk.start"
        :photos="chunk.items"
        :start-index="chunk.start"
        :morph-id="morphId"
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
import type { EventPhoto } from '~/types/event'

const CHUNK = 50

const props = defineProps<{
  photos: EventPhoto[]
  hasMore: boolean
  loading: boolean
  busy?: boolean
  morphId?: number | null
}>()

const emit = defineEmits<{
  (e: 'open', index: number): void
  (e: 'load-more'): void
}>()

// Group the flat accumulated list into fixed-size sections so each can
// independently virtualize (see WallSection).
const chunks = computed(() => {
  const out: { start: number; items: EventPhoto[] }[] = []
  for (let i = 0; i < props.photos.length; i += CHUNK) {
    out.push({ start: i, items: props.photos.slice(i, i + CHUNK) })
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
