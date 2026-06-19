<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="active"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Photo viewer"
        @click="close"
        tabindex="0"
        ref="lightboxEl"
      >
        <div class="lightbox__noise" />

        <button
          v-if="images.length > 1"
          class="lightbox__nav lightbox__nav--prev"
          @click.stop="prev"
          aria-label="Previous image"
        >&lt;</button>
        <button
          v-if="images.length > 1"
          class="lightbox__nav lightbox__nav--next"
          @click.stop="next"
          aria-label="Next image"
        >&gt;</button>

        <div class="lightbox__frame" @click.stop>
          <img
            :key="reel ? index : undefined"
            :src="current?.src ?? ''"
            :alt="current?.alt ?? ''"
            class="lightbox__image"
            :class="{ 'lightbox__image--kenburns': reel }"
            :style="morphName ? { viewTransitionName: morphName } : undefined"
            @click.stop="next"
          />
          <div class="lightbox__hud">
            <button
              v-if="reel"
              class="lightbox__reel"
              type="button"
              :aria-label="reelPaused ? 'Resume slideshow' : 'Pause slideshow'"
              @click.stop="reelPaused = !reelPaused"
            >{{ reelPaused ? '▶ REEL' : '⏸ REEL' }}</button>
            <span class="lightbox__counter">
              <span class="lightbox__counter-current">{{ pad(index + 1) }}</span>
              <span class="lightbox__counter-sep">/</span>
              <span class="lightbox__counter-total">{{ pad(images.length) }}</span>
            </span>
            <span v-if="dimensions" class="lightbox__dimensions">{{ dimensions }}</span>
            <span v-if="showFilename && filename" class="lightbox__filename">{{ filename }}</span>

            <!-- Optional slot for actions (likes / share / takedown). The wall
                 page fills this; the project page leaves it empty. -->
            <span class="lightbox__actions">
              <slot name="actions" :image="current" :index="index" />
            </span>
          </div>
        </div>

        <button class="lightbox__close" @click.stop="close" aria-label="Close">
          <span class="lightbox__close-key">esc</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// Shared lightbox overlay: CRT-noise backdrop, mono HUD, keyboard nav, body
// scroll-lock. Extracted from pages/proj/[slug].vue so both the documentary
// project galleries and the event-photo wall share one implementation.

export interface LightboxImage {
  src: string
  alt?: string
  width?: string | number | null
  height?: string | number | null
  id?: number
}

const props = withDefaults(defineProps<{
  images: LightboxImage[]
  index: number
  active: boolean
  showFilename?: boolean
  morphName?: string
  reel?: boolean
  reelInterval?: number
}>(), {
  showFilename: true,
  reel: false,
  reelInterval: 5000,
})

const emit = defineEmits<{
  (e: 'update:index', value: number): void
  (e: 'update:active', value: boolean): void
  (e: 'close'): void
}>()

const lightboxEl = ref<HTMLElement | null>(null)

const current = computed(() => props.images[props.index])

const pad = (n: number) => String(n).padStart(2, '0')

const filename = computed(() => {
  const src = current.value?.src ?? ''
  const parts = src.split('/')
  return parts[parts.length - 1]?.replace(/\.[^.]+$/, '') ?? ''
})

const dimensions = computed(() => {
  const img = current.value
  if (!img?.width || !img?.height) return ''
  return `${img.width}x${img.height}`
})

function next() {
  if (props.images.length <= 1) return
  emit('update:index', (props.index + 1) % props.images.length)
}

function prev() {
  if (props.images.length <= 1) return
  emit('update:index', (props.index - 1 + props.images.length) % props.images.length)
}

function close() {
  // Parent owns the actual close (it may wrap it in a View Transition).
  emit('close')
}

// ─── Body scroll-lock (iOS-safe: position:fixed) ────────────────
let savedScrollY = 0

function lockScroll() {
  savedScrollY = window.scrollY
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.width = '100%'
  document.body.style.top = `-${savedScrollY}px`
}

function unlockScroll() {
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.width = ''
  document.body.style.top = ''
  window.scrollTo(0, savedScrollY)
}

let lastFocused: HTMLElement | null = null

watch(() => props.active, (isActive) => {
  if (!import.meta.client) return
  if (isActive) {
    lastFocused = document.activeElement as HTMLElement | null
    lockScroll()
    nextTick(() => lightboxEl.value?.focus())
  } else {
    unlockScroll()
    // Return focus to whatever opened the lightbox (the source tile).
    nextTick(() => lastFocused?.focus?.())
  }
})

function onKeydown(e: KeyboardEvent) {
  if (!props.active) return
  if (e.key === 'Escape') close()
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next() }
  if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
}

// ─── Reel mode: auto-advance every reelInterval ms ──────────────
let reelTimer: ReturnType<typeof setInterval> | null = null
const reelPaused = ref(false)

function stopReel() {
  if (reelTimer) { clearInterval(reelTimer); reelTimer = null }
}

function startReel() {
  stopReel()
  if (props.reel && props.active && props.images.length > 1) {
    reelTimer = setInterval(() => {
      if (!document.hidden && !reelPaused.value) next()
    }, props.reelInterval)
  }
}

// (Re)start the dwell whenever the reel opens or the slide changes, so each
// photo gets a full interval (manual nav also resets the clock).
watch(() => [props.active, props.reel, props.index], startReel)
// A fresh reel always starts playing.
watch(() => props.reel && props.active, (on) => { if (on) reelPaused.value = false })

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  stopReel()
  if (props.active) unlockScroll()
})
</script>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(8, 8, 8, 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  overscroll-behavior: contain;
  overflow: hidden;
  touch-action: none;
}

.lightbox__noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255, 255, 255, 0.008) 2px,
    rgba(255, 255, 255, 0.008) 4px
  );
  z-index: 1;
}

.lightbox__frame {
  position: relative;
  max-width: 92vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
}

.lightbox__image {
  max-width: 92vw;
  max-height: 82vh;
  object-fit: contain;
  cursor: pointer;
  user-select: none;
  animation: lightbox-in 250ms ease-out;
}

/* Ken Burns: slow pan/zoom per slide in reel mode. */
.lightbox__image--kenburns {
  animation: kenburns 5.4s ease-out both;
}

@keyframes lightbox-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
}

@keyframes kenburns {
  0%   { transform: scale(1.04) translate(0, 0); opacity: 0; }
  8%   { opacity: 1; }
  100% { transform: scale(1.13) translate(-1.6%, -1.2%); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .lightbox__image--kenburns { animation: lightbox-in 250ms ease-out; }
}

.lightbox__reel {
  color: var(--color-accent);
  font-weight: 500;
  letter-spacing: 0.12em;
  animation: reel-pulse 2s ease-in-out infinite;
}

@keyframes reel-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.lightbox__hud {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.625rem 0;
  margin-top: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-muted);
  letter-spacing: 0.04em;
  width: 100%;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.lightbox__counter {
  color: var(--color-text);
}

.lightbox__counter-current {
  color: var(--color-accent);
}

.lightbox__counter-sep {
  color: var(--color-border);
  margin: 0 0.15em;
}

.lightbox__counter-total {
  color: var(--color-muted);
}

.lightbox__dimensions {
  color: var(--color-muted);
}

.lightbox__dimensions::before {
  content: '[';
  color: var(--color-border);
}

.lightbox__dimensions::after {
  content: ']';
  color: var(--color-border);
}

.lightbox__filename {
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 30ch;
  opacity: 0.5;
}

/* Actions slot sits at the right edge of the HUD. */
.lightbox__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.lightbox__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 1.25rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 150ms;
}

.lightbox__nav:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-dim);
}

.lightbox__nav--prev {
  left: 1rem;
}

.lightbox__nav--next {
  right: 1rem;
}

.lightbox__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 3;
  background: none;
  border: 1px solid var(--color-border);
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  transition: all 150ms;
}

.lightbox__close:hover {
  border-color: var(--color-accent);
}

.lightbox__close-key {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.lightbox__close:hover .lightbox__close-key {
  color: var(--color-accent);
}

.lightbox-enter-active {
  transition: opacity 200ms ease;
}

.lightbox-enter-active .lightbox__image {
  animation: lightbox-in 250ms ease-out;
}

.lightbox-leave-active {
  transition: opacity 150ms ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .lightbox {
    background: rgb(8, 8, 8);
  }

  .lightbox__frame {
    max-width: 100vw;
    max-height: 100vh;
    padding: 0 0.5rem;
  }

  .lightbox__image {
    max-width: 100vw;
    max-height: 75vh;
  }

  .lightbox__nav {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1rem;
    background: rgba(8, 8, 8, 0.6);
  }

  .lightbox__nav--prev { left: 0.25rem; }
  .lightbox__nav--next { right: 0.25rem; }

  .lightbox__hud {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem;
    font-size: 0.6rem;
  }

  .lightbox__actions {
    margin-left: 0;
    width: 100%;
  }

  .lightbox__filename {
    max-width: 16ch;
  }

  .lightbox__close {
    top: 0.5rem;
    right: 0.5rem;
  }
}
</style>
