<template>
  <div class="wall">
    <EventWallSection
      v-for="chunk in chunks"
      :key="chunk.start"
      :photos="chunk.items"
      :start-index="chunk.start"
      :morph-id="morphId"
      @open="$emit('open', $event)"
    />

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
