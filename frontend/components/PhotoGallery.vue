<template>
  <div class="gallery-wrap">
    <!-- ── Photo frame ───────────────────────────────────────── -->
    <div
      ref="containerRef"
      class="gallery"
      :class="{ 'gallery--flipping': state !== 'idle', 'gallery--touch': isTouchDevice }"
      role="region"
      aria-label="Photo gallery"
      tabindex="0"
      @click="handleClick"
      @keydown.arrow-right.prevent="advance"
      @keydown.arrow-left.prevent="goBack"
    >
      <!-- BG layer: next image — only visible while flipping -->
      <div class="gallery__slot gallery__slot--bg" aria-hidden="true">
        <img
          v-if="photos[neighborIndex]"
          :key="`bg-${neighborIndex}`"
          :src="photos[neighborIndex].image.src"
          :alt="photos[neighborIndex].image.alt"
          class="gallery__img"
          loading="eager"
          decoding="async"
        />
      </div>

      <!-- FG layer: current image, flips away on advance -->
      <div
        class="gallery__slot gallery__slot--fg"
        :class="{
          'gallery__slot--flip-next': state === 'flip-next',
          'gallery__slot--flip-prev': state === 'flip-prev',
        }"
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

      <!-- Swipe drag overlay (mobile only, while swiping) -->
      <div
        v-if="isSwiping && Math.abs(dragOffset) > 4"
        class="gallery__drag"
        :style="{ transform: `translateX(${dragOffset}px)` }"
        aria-hidden="true"
      >
        <img
          v-if="photos[currentIndex]"
          :src="photos[currentIndex].image.src"
          class="gallery__img"
        />
      </div>

      <!-- Corner dog-ear hint (desktop only) -->
      <div class="gallery__corner gallery__corner--next" aria-hidden="true" />
      <div v-if="currentIndex > 0" class="gallery__corner gallery__corner--prev" aria-hidden="true" />

      <!-- Spotlight indicator -->
      <div v-if="photos[currentIndex]?.sticky" class="gallery__spotlight" aria-hidden="true">
        <span class="gallery__spotlight-dot" />
      </div>

      <!-- Dot indicators -->
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

      <div class="sr-only" aria-live="polite" aria-atomic="true">
        Photo {{ currentIndex + 1 }} of {{ photos.length }}
      </div>
    </div>

    <!-- ── Caption — below the frame, never on the photo ────── -->
    <Transition name="caption" mode="out-in">
      <div
        v-if="current"
        :key="currentIndex"
        class="gallery__caption"
      >
        <div class="gallery__caption-left">
          <p class="gallery__caption-title">{{ current.title }}</p>
          <p v-if="current.caption" class="gallery__caption-text">{{ current.caption }}</p>
        </div>
        <div class="gallery__caption-right">
          <time class="gallery__caption-date" :datetime="current.date">{{ formatDate(current.date) }}</time>
          <a
            v-if="current.url"
            :href="current.url"
            class="gallery__caption-link"
            target="_blank"
            rel="noopener"
          >Read →</a>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useSwipe } from '@vueuse/core'

interface Photo {
  id: number
  title: string
  caption?: string
  date: string
  slug: string
  url?: string
  sticky: boolean
  image: { src: string; alt: string; width: number | null; height: number | null }
}

const props = defineProps<{ photos: Photo[] }>()

// ── State ────────────────────────────────────────────────────
const currentIndex  = ref(0)
const state         = ref<'idle' | 'flip-next' | 'flip-prev'>('idle')
const containerRef  = ref<HTMLElement | null>(null)
const isTouchDevice = ref(false)

const current       = computed(() => props.photos[currentIndex.value] ?? null)

// neighborIndex: what the bg layer should show while flipping
const neighborIndex = computed(() => {
  if (state.value === 'flip-prev') return Math.max(0, currentIndex.value - 1)
  return Math.min(props.photos.length - 1, currentIndex.value + 1)
})

// Dot window: max 7 centred on currentIndex
const MAX_DOTS  = 7
const dotOffset = computed(() =>
  Math.max(0, Math.min(currentIndex.value - Math.floor(MAX_DOTS / 2), props.photos.length - MAX_DOTS))
)
const dotRange  = computed(() => Array.from({ length: Math.min(MAX_DOTS, props.photos.length) }))

// ── Touch device detection ───────────────────────────────────
onMounted(() => {
  isTouchDevice.value = window.matchMedia('(pointer: coarse)').matches
})

// ── Swipe (mobile) ───────────────────────────────────────────
const dragOffset = ref(0)

const { isSwiping, lengthX } = useSwipe(containerRef, {
  passive:   true,
  threshold: 10,
  onSwipe() {
    dragOffset.value = -lengthX.value * 0.38
  },
  onSwipeEnd(_, dir) {
    dragOffset.value = 0
    if (dir === 'left'  && currentIndex.value < props.photos.length - 1) advance()
    if (dir === 'right' && currentIndex.value > 0)                        goBack()
  },
})

// ── Navigation ───────────────────────────────────────────────
function advance() {
  if (state.value !== 'idle' || currentIndex.value >= props.photos.length - 1) return
  state.value = 'flip-next'
}

function goBack() {
  if (state.value !== 'idle' || currentIndex.value <= 0) return
  state.value = 'flip-prev'
}

function jumpTo(index: number) {
  if (state.value !== 'idle' || index === currentIndex.value) return
  if (index > currentIndex.value) { currentIndex.value = index - 1; advance() }
  else                             { currentIndex.value = index + 1; goBack()  }
}

function handleClick(e: MouseEvent) {
  if (!containerRef.value) return
  const xRel = (e.clientX - containerRef.value.getBoundingClientRect().left) / containerRef.value.offsetWidth
  if (xRel >= 0.4) advance()
  else              goBack()
}

// ── Flip end: swap image, reset state ───────────────────────
function onFlipEnd() {
  if (state.value === 'flip-next') currentIndex.value++
  if (state.value === 'flip-prev') currentIndex.value--
  state.value = 'idle'
}

// ── Date formatting ──────────────────────────────────────────
function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<style scoped>
/* ── Wrapper ── */
.gallery-wrap {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Photo frame ── */
.gallery {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  max-height: 65svh;
  background: #0a0a0a;
  overflow: hidden;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
}

/* ── Image slots ── */
.gallery__slot {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* BG: hidden when idle, visible when flipping */
.gallery__slot--bg {
  z-index: 1;
  opacity: 0;
  transition: none;
}
.gallery--flipping .gallery__slot--bg {
  opacity: 1;
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

/* ── Flip animations ── */
.gallery__slot--flip-next {
  animation: flip-out-next 0.32s cubic-bezier(0.55, 0, 1, 0.45) forwards;
}
.gallery__slot--flip-prev {
  animation: flip-out-prev 0.32s cubic-bezier(0.55, 0, 1, 0.45) forwards;
}

@keyframes flip-out-next {
  0%   { transform: perspective(1800px) rotateY(0deg);   opacity: 1; }
  100% { transform: perspective(1800px) rotateY(-90deg); opacity: 0; }
}
@keyframes flip-out-prev {
  0%   { transform: perspective(1800px) rotateY(0deg);  opacity: 1; }
  100% { transform: perspective(1800px) rotateY(90deg); opacity: 0; }
}

/* ── Swipe drag layer ── */
.gallery__drag {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform;
}

/* ── Corner dog-ear (desktop pointer:fine only) ── */
@media (pointer: fine) {
  .gallery__corner {
    position: absolute;
    width: 40px;
    height: 40px;
    z-index: 4;
    pointer-events: none;
    transition: width 0.22s ease, height 0.22s ease;
  }
  .gallery__corner--next {
    bottom: 0; right: 0;
    clip-path: polygon(100% 0, 100% 100%, 0 100%);
    background: linear-gradient(225deg, rgba(255,255,255,0.13) 30%, transparent 100%);
    filter: drop-shadow(-2px -2px 6px rgba(0,0,0,0.5));
  }
  .gallery__corner--prev {
    bottom: 0; left: 0;
    clip-path: polygon(0 0, 100% 100%, 0 100%);
    background: linear-gradient(315deg, rgba(255,255,255,0.09) 30%, transparent 100%);
    filter: drop-shadow(2px -2px 6px rgba(0,0,0,0.5));
  }
  .gallery:hover .gallery__corner--next { width: 68px; height: 68px; }
  .gallery:hover .gallery__corner--prev { width: 56px; height: 56px; }
}
@media (pointer: coarse) {
  .gallery__corner { display: none; }
}

/* ── Spotlight dot ── */
.gallery__spotlight {
  position: absolute;
  top: 10px; right: 10px;
  z-index: 5;
  pointer-events: none;
}
.gallery__spotlight-dot {
  display: block;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: rgba(255,255,255,0.55);
  animation: pulse-dot 2.5s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%       { opacity: 0.9; transform: scale(1.4); }
}

/* ── Dot indicators ── */
.gallery__dots {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  gap: 5px;
  align-items: center;
  pointer-events: none;
}
.gallery__dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  border: none;
  padding: 0;
  background: rgba(255,255,255,0.22);
  transition: all 0.2s;
  pointer-events: all;
}
.gallery__dot--active {
  width: 6px; height: 6px;
  background: rgba(255,255,255,0.7);
}

/* ── Caption — below the frame ── */
.gallery__caption {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.875rem 0 0;
  border-top: 1px solid var(--color-border, #e5e5e5);
  min-height: 3.5rem;
}

.gallery__caption-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.gallery__caption-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text, #1a1a1a);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gallery__caption-text {
  font-size: 0.8125rem;
  color: var(--color-muted, #666);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.gallery__caption-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  flex-shrink: 0;
}

.gallery__caption-date {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  color: var(--color-muted, #666);
  white-space: nowrap;
}

.gallery__caption-link {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  color: var(--color-text, #1a1a1a);
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  padding-bottom: 1px;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.gallery__caption-link:hover { opacity: 0.6; }

/* ── Caption transition ── */
.caption-enter-active { transition: opacity 0.2s, transform 0.2s; }
.caption-leave-active { transition: opacity 0.15s; }
.caption-enter-from   { opacity: 0; transform: translateY(4px); }
.caption-leave-to     { opacity: 0; }

/* ── Screen reader only ── */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border-width: 0;
}
</style>
