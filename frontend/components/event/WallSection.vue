<template>
  <section
    ref="el"
    class="wall-section"
    :class="{ 'wall-section--dark': darkroom }"
    :style="spacerStyle"
  >
    <template v-if="visible">
      <div
        v-for="(row, ri) in rows"
        :key="ri"
        class="wall-row"
        :style="{ height: row.height + 'px' }"
      >
        <button
          v-for="cell in row.items"
          :key="cell.photo.id"
          class="tile"
          type="button"
          :style="{ width: cell.width + 'px' }"
          :aria-label="`Open photo ${cell.index + 1}`"
          @click="$emit('open', cell.index)"
        >
          <img
            class="tile__img"
            :src="cell.photo.images?.medium || cell.photo.images?.large || cell.photo.images?.full || ''"
            :srcset="srcset(cell.photo)"
            sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 22vw"
            :alt="cell.photo.images?.alt || ''"
            :style="cell.photo.id === morphId ? { viewTransitionName: 'ct-hero-photo' } : undefined"
            loading="lazy"
            decoding="async"
          />
          <span class="tile__overlay" aria-hidden="true">
            <span v-if="cell.photo.likeCount" class="tile__likes">♥ {{ cell.photo.likeCount }}</span>
          </span>
        </button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
// One windowed block of the wall: a run of pre-computed justified rows. When
// scrolled far from the viewport it collapses to a spacer of its height, so the
// live DOM never holds more than the few blocks near the viewport - the key to
// rendering thousands of photos smoothly.
//
// The justified-rows layout is computed once in the parent (PhotoWall), which
// knows the container width; each row is a flex line whose tiles are sized so
// the row spans the full width edge-to-edge, in strict given order. The parent
// also passes an estimated block height (estHeight) so a block that starts life
// off-screen reserves the right space before it has ever been measured.
import type { EventPhoto, WallRow } from '~/types/event'

const props = defineProps<{
  rows: WallRow[]
  estHeight: number
  morphId?: number | null
  darkroom?: boolean
}>()

defineEmits<{ (e: 'open', index: number): void }>()

const el = ref<HTMLElement | null>(null)
const visible = ref(true) // render on first paint (SSR-friendly + measurable)
const measured = ref(0)

// While collapsed, hold the (measured, else estimated) height so scroll position
// is preserved and an unseen block still reserves its space.
const spacerStyle = computed(() => {
  if (visible.value) return null
  const h = measured.value || props.estHeight
  return h ? { height: `${h}px` } : null
})

function srcset(photo: EventPhoto): string {
  const img = photo.images
  if (!img) return ''
  const parts: string[] = []
  if (img.medium) parts.push(`${img.medium} 300w`)
  if (img.large) parts.push(`${img.large} 1024w`)
  return parts.join(', ')
}

useIntersectionObserver(
  el,
  ([entry]) => {
    if (entry.isIntersecting) {
      visible.value = true
    } else {
      if (el.value && visible.value) {
        measured.value = el.value.offsetHeight
      }
      visible.value = false
    }
  },
  { rootMargin: '1400px 0px' }
)
</script>

<style scoped>
.wall-section {
  padding: 0 2px;
}

.wall-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.tile {
  display: block;
  height: 100%;
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
  border: none;
  background: var(--color-surface);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  /* Lift toward the viewer on hover: the tile itself scales up and rises above
     its neighbours (z-index), so the photo reads as coming forward rather than
     just cropping in. */
  transition: transform 360ms cubic-bezier(0.2, 0, 0, 1), box-shadow 360ms ease;
  transform-origin: center;
}

.tile:hover,
.tile:focus-visible {
  transform: scale(1.09) translateY(-4px);
  z-index: 3;
  box-shadow:
    0 22px 48px -14px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: visible;
}

.tile__img {
  display: block;
  width: 100%;
  height: 100%;
  /* Tiles are sized to each photo's exact aspect ratio, so cover trims nothing
     visible - it just guarantees the row stays gap-free under sub-pixel rounding. */
  object-fit: cover;
  border-radius: inherit;
  transition: transform 500ms ease, filter 300ms ease;
}

/* A touch of extra inner zoom on top of the tile lift, for depth. */
.tile:hover .tile__img,
.tile:focus-visible .tile__img {
  transform: scale(1.05);
  filter: brightness(1.12);
}

/* Darkroom: every photo sinks to a low ember; the moving spotlight overlay
   reveals what it passes over, and the hovered tile blooms back to full life. */
.wall-section--dark .tile__img {
  filter: brightness(0.55) saturate(0.82) contrast(1.02);
}
.wall-section--dark .tile:hover .tile__img,
.wall-section--dark .tile:focus-visible .tile__img {
  filter: brightness(1.2) saturate(1.08) contrast(1.02);
}

@media (prefers-reduced-motion: reduce) {
  .tile { transition: box-shadow 360ms ease; }
  .tile:hover,
  .tile:focus-visible { transform: none; }
  .tile:hover .tile__img,
  .tile:focus-visible .tile__img { transform: none; }
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
