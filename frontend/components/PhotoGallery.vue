<template>
  <div
    ref="containerRef"
    class="gallery"
    :class="{ 'gallery--touch': isTouchDevice }"
    role="region"
    aria-label="Photo gallery"
    @click="handleClick"
    @keydown.arrow-right.prevent="advance"
    @keydown.arrow-left.prevent="goBack"
    tabindex="0"
  >
    <!-- ── Background: next photo (revealed as current flips away) ── -->
    <div class="gallery__slot gallery__slot--bg" aria-hidden="true">
      <img
        v-if="photos[nextIndex]"
        :key="`bg-${nextIndex}`"
        :src="photos[nextIndex].image.src"
        :alt="photos[nextIndex].image.alt"
        class="gallery__img"
        loading="eager"
        decoding="async"
      />
    </div>

    <!-- ── Foreground: current photo (flips away on advance) ── -->
    <div
      class="gallery__slot gallery__slot--fg"
      :class="{ 'gallery__slot--flipping-next': state === 'flip-next', 'gallery__slot--flipping-prev': state === 'flip-prev' }"
      aria-hidden="true"
      @animationend="onFlipEnd"
    >
      <img
        v-if="photos[currentIndex]"
        :key="`fg-${currentIndex}`"
        :src="photos[currentIndex].image.src"
        :alt="photos[currentIndex].image.alt"
        class="gallery__img"
        loading="eager"
        decoding="async"
      />
    </div>

    <!-- ── Swipe drag layer (mobile) ── -->
    <div
      v-if="isSwiping"
      class="gallery__swipe-layer"
      :style="{ transform: `translateX(${dragOffset}px)` }"
      aria-hidden="true"
    >
      <img
        v-if="photos[currentIndex]"
        :src="photos[currentIndex].image.src"
        class="gallery__img"
      />
    </div>

    <!-- ── Corner dog-ear (desktop only, navigation hint) ── -->
    <div class="gallery__corner gallery__corner--next" aria-hidden="true" />
    <div v-if="currentIndex > 0" class="gallery__corner gallery__corner--prev" aria-hidden="true" />

    <!-- ── Spotlight badge ── -->
    <div v-if="photos[currentIndex]?.sticky" class="gallery__spotlight" aria-label="Spotlight photo">
      <span class="gallery__spotlight-dot" />
    </div>

    <!-- ── Dot indicators (below image, not on it) ── -->
    <div v-if="photos.length > 1" class="gallery__dots" role="tablist" aria-label="Photo navigation">
      <button
        v-for="(_, i) in dotRange"
        :key="i"
        class="gallery__dot"
        :class="{ 'gallery__dot--active': i + dotOffset === currentIndex }"
        role="tab"
        :aria-selected="i + dotOffset === currentIndex"
        :aria-label="`Photo ${i + dotOffset + 1}`"
        @click.stop="jumpTo(i + dotOffset)"
      />
    </div>

    <!-- Screen-reader live region -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      Photo {{ currentIndex + 1 }} of {{ photos.length }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSwipe, SwipeDirection } from '@vueuse/core'

interface Photo {
  id: number
  title: string
  date: string
  slug: string
  sticky: boolean
  image: { src: string; alt: string; width: number | null; height: number | null }
}

const props = defineProps<{ photos: Photo[] }>()

// ── State ────────────────────────────────────────────────────────────
const currentIndex = ref(0)
const state        = ref<'idle' | 'flip-next' | 'flip-prev'>('idle')
const containerRef = ref<HTMLElement | null>(null)
const isTouchDevice = ref(false)

// nextIndex is computed so the bg layer always shows the right photo
const nextIndex = computed(() => {
  if (state.value === 'flip-prev') return Math.max(0, currentIndex.value - 1)
  return Math.min(props.photos.length - 1, currentIndex.value + 1)
})

// Dot window: show max 7 dots centred on current
const MAX_DOTS  = 7
const dotOffset = computed(() => Math.max(0, Math.min(currentIndex.value - Math.floor(MAX_DOTS / 2), props.photos.length - MAX_DOTS)))
const dotRange  = computed(() => Array.from({ length: Math.min(MAX_DOTS, props.photos.length) }))

// ── Touch detection ─────────────────────────────────────────────────
onMounted(() => {
  isTouchDevice.value = window.matchMedia('(pointer: coarse)').matches
})

// ── Swipe (mobile) ───────────────────────────────────────────────────
const dragOffset  = ref(0)

const { isSwiping, direction, lengthX } = useSwipe(containerRef, {
  passive:    true,
  threshold:  10,
  onSwipe() {
    // Live drag feedback (only horizontal)
    if (Math.abs(lengthX.value) > Math.abs(lengthX.value * 0.3)) {
      dragOffset.value = -lengthX.value * 0.4 // 40% rubber-band
    }
  },
  onSwipeEnd(_, dir) {
    dragOffset.value = 0
    if (dir === SwipeDirection.Left  && currentIndex.value < props.photos.length - 1) advance()
    if (dir === SwipeDirection.Right && currentIndex.value > 0)                        goBack()
  },
})

// ── Navigation ───────────────────────────────────────────────────────
function advance() {
  if (state.value !== 'idle') return
  if (currentIndex.value >= props.photos.length - 1) return
  state.value = 'flip-next'
}

function goBack() {
  if (state.value !== 'idle') return
  if (currentIndex.value <= 0) return
  state.value = 'flip-prev'
}

function jumpTo(index: number) {
  if (state.value !== 'idle') return
  if (index === currentIndex.value) return
  if (index > currentIndex.value) {
    currentIndex.value = index - 1
    advance()
  } else {
    currentIndex.value = index + 1
    goBack()
  }
}

function handleClick(e: MouseEvent) {
  if (!containerRef.value) return
  const rect  = containerRef.value.getBoundingClientRect()
  const xRel  = (e.clientX - rect.left) / rect.width
  // Right 60% of image → advance; Left 40% → go back
  if (xRel >= 0.4) advance()
  else              goBack()
}

// ── Flip animation end ───────────────────────────────────────────────
function onFlipEnd() {
  if (state.value === 'flip-next') currentIndex.value++
  if (state.value === 'flip-prev') currentIndex.value--
  state.value = 'idle'
}
</script>

<style scoped>
/* ── Container ── */
.gallery {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  max-height: 70svh;
  background: #0a0a0a;
  overflow: hidden;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
}

/* On touch devices, natural cursor */
.gallery--touch { cursor: default; }

/* ── Image slots ── */
.gallery__slot {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery__slot--fg {
  z-index: 2;
  transform-origin: left center;
  will-change: transform, opacity;
}

.gallery__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

/* ── Page flip animations ── */
.gallery__slot--flipping-next {
  animation: flip-out-next 0.32s cubic-bezier(0.4, 0, 1, 1) forwards;
}

.gallery__slot--flipping-prev {
  animation: flip-out-prev 0.32s cubic-bezier(0.4, 0, 1, 1) forwards;
}

@keyframes flip-out-next {
  0%   { transform: perspective(1800px) rotateY(0deg);    opacity: 1; }
  100% { transform: perspective(1800px) rotateY(-90deg);  opacity: 0; }
}

@keyframes flip-out-prev {
  0%   { transform: perspective(1800px) rotateY(0deg);   opacity: 1; }
  100% { transform: perspective(1800px) rotateY(90deg);  opacity: 0; }
}

/* ── Swipe drag layer ── */
.gallery__swipe-layer {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: none;
  will-change: transform;
}

/* ── Corner dog-ear (desktop only) ── */
@media (pointer: fine) {
  .gallery__corner {
    position: absolute;
    width: 44px;
    height: 44px;
    transition: width 0.22s ease, height 0.22s ease;
    z-index: 4;
    pointer-events: none;
  }

  .gallery__corner--next {
    bottom: 0;
    right: 0;
    clip-path: polygon(100% 0, 100% 100%, 0 100%);
    background: linear-gradient(
      225deg,
      rgba(255, 255, 255, 0.14) 30%,
      rgba(255, 255, 255, 0.04) 70%,
      transparent 100%
    );
    filter: drop-shadow(-2px -2px 6px rgba(0, 0, 0, 0.5));
  }

  .gallery__corner--prev {
    bottom: 0;
    left: 0;
    clip-path: polygon(0 0, 100% 100%, 0 100%);
    background: linear-gradient(
      315deg,
      rgba(255, 255, 255, 0.1) 30%,
      transparent 100%
    );
    filter: drop-shadow(2px -2px 6px rgba(0, 0, 0, 0.5));
  }

  .gallery:hover .gallery__corner--next,
  .gallery:focus-visible .gallery__corner--next {
    width: 72px;
    height: 72px;
  }
}

/* Hide corners on touch */
@media (pointer: coarse) {
  .gallery__corner { display: none; }
}

/* ── Spotlight dot ── */
.gallery__spotlight {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 5;
  pointer-events: none;
}

.gallery__spotlight-dot {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
  animation: pulse-dot 2.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.3); }
}

/* ── Dot indicators ── */
.gallery__dots {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}

.gallery__dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  border: none;
  padding: 0;
  transition: all 0.2s;
  pointer-events: all;
  cursor: none;
}

.gallery__dot--active {
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.75);
}

@media (pointer: coarse) {
  .gallery__dot { cursor: default; }
}

/* ── Screen-reader only ── */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
