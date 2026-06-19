<template>
  <section
    ref="el"
    class="wall-section"
    :style="!visible && collapsedHeight ? { height: collapsedHeight + 'px' } : null"
  >
    <template v-if="visible">
      <button
        v-for="(photo, i) in photos"
        :key="photo.id"
        class="tile"
        type="button"
        :aria-label="`Open photo ${startIndex + i + 1}`"
        @click="$emit('open', startIndex + i)"
      >
        <img
          class="tile__img"
          :src="photo.images?.medium || photo.images?.large || photo.images?.full || ''"
          :srcset="srcset(photo)"
          sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 22vw"
          :width="photo.images?.width || undefined"
          :height="photo.images?.height || undefined"
          :alt="photo.images?.alt || ''"
          :style="photo.id === morphId ? { viewTransitionName: 'ct-hero-photo' } : undefined"
          loading="lazy"
          decoding="async"
        />
        <span class="tile__overlay" aria-hidden="true">
          <span v-if="photo.likeCount" class="tile__likes">♥ {{ photo.likeCount }}</span>
        </span>
      </button>
    </template>
  </section>
</template>

<script setup lang="ts">
// One chunk (~one page) of the wall. Self-virtualizes: when scrolled far from
// the viewport it collapses to a spacer of its last measured height, so the
// live DOM never holds more than the few sections near the viewport - the key
// to rendering thousands of photos smoothly.
import type { EventPhoto } from '~/types/event'

const props = defineProps<{
  photos: EventPhoto[]
  startIndex: number
  morphId?: number | null
}>()

defineEmits<{ (e: 'open', index: number): void }>()

const el = ref<HTMLElement | null>(null)
const visible = ref(true) // render on first paint (SSR-friendly + measurable)
const collapsedHeight = ref(0)

function srcset(photo: EventPhoto): string {
  const img = photo.images
  if (!img) return ''
  const parts: string[] = []
  if (img.medium) parts.push(`${img.medium} 300w`)
  if (img.large) parts.push(`${img.large} 1024w`)
  return parts.join(', ')
}

// Measure height before collapsing so the spacer preserves scroll position.
useIntersectionObserver(
  el,
  ([entry]) => {
    if (entry.isIntersecting) {
      visible.value = true
    } else {
      if (el.value && visible.value) {
        collapsedHeight.value = el.value.offsetHeight
      }
      visible.value = false
    }
  },
  { rootMargin: '1400px 0px' }
)
</script>

<style scoped>
.wall-section {
  columns: 5 220px;
  column-gap: 4px;
  padding: 0 2px;
}

@media (max-width: 1024px) {
  .wall-section { columns: 3 200px; }
}
@media (max-width: 480px) {
  .wall-section { columns: 2 140px; }
}

.tile {
  display: block;
  width: 100%;
  margin: 0 0 4px;
  padding: 0;
  border: none;
  background: var(--color-surface);
  cursor: pointer;
  position: relative;
  break-inside: avoid;
  overflow: hidden;
}

.tile__img {
  display: block;
  width: 100%;
  height: auto;
  transition: transform 500ms ease, filter 300ms ease;
}

.tile:hover .tile__img {
  transform: scale(1.04);
  filter: brightness(1.12);
}

.tile__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 0.4rem 0.5rem;
  opacity: 0;
  background: linear-gradient(180deg, transparent 55%, rgba(8, 8, 8, 0.55) 100%);
  transition: opacity 200ms ease;
}
.tile:hover .tile__overlay { opacity: 1; }

.tile__likes {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-text);
}
</style>
