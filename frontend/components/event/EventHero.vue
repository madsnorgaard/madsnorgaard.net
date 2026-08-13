<template>
  <header class="hero">
    <!-- Auto-drifting strip of thumbnails behind the copy. Pure CSS transform,
         GPU-composited; disabled for prefers-reduced-motion (see styles). -->
    <div class="hero__drift" aria-hidden="true">
      <div class="hero__track">
        <img
          v-for="(thumb, i) in doubled"
          :key="i"
          :src="thumb.src"
          :srcset="thumb.srcset"
          :sizes="thumb.srcset ? '(max-width: 640px) 39vh, 57vh' : undefined"
          alt=""
          :loading="i < 5 ? 'eager' : 'lazy'"
          :fetchpriority="i < 2 ? 'high' : undefined"
          decoding="async"
          class="hero__thumb"
        />
      </div>
    </div>
    <div class="hero__scrim" aria-hidden="true" />

    <div class="hero__inner">
      <p class="hero__kicker">Cape Town · every second Sunday · 2008–2013</p>
      <h1 class="hero__title">Cold Turkey</h1>
      <p class="hero__lede">
        For a few years, on certain Sundays, the city let go. The speakers were
        loud, the floor was sweat and smoke, and nobody was watching the clock.
        Here are the photographs, thousands of them, mostly unlabelled, exactly
        as they were shot. Find the night you were there. You are somewhere in here.
      </p>
      <button class="hero__enter" type="button" @click="$emit('enter')">
        Enter the wall <span aria-hidden="true">↓</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { PhotoImages } from '~/types/photo'
import { buildSrcset, fallbackSrc } from '~/utils/wp-srcset'

const props = defineProps<{
  thumbs: PhotoImages[]
}>()

defineEmits<{ (e: 'enter'): void }>()

// Duplicate the strip so the marquee loops seamlessly. The 38vh frames never
// need more than a 768px file; the second (duplicated) half starts off-screen
// and the marquee takes 45s to reach it, so it always lazy-loads.
const doubled = computed(() => {
  const t = props.thumbs.slice(0, 20).map((images) => {
    const built = buildSrcset(images.variants, 768)
    return built
      ? { src: built.src, srcset: built.srcset }
      : { src: fallbackSrc(images, 'small'), srcset: undefined }
  })
  return t.length ? [...t, ...t] : []
})
</script>

<style scoped>
.hero {
  position: relative;
  min-height: min(82vh, 760px);
  display: flex;
  align-items: center;
  overflow: hidden;
  background: var(--color-bg);
}

.hero__drift {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  opacity: 0.48;
}

.hero__track {
  display: flex;
  gap: 4px;
  width: max-content;
  animation: hero-drift 90s linear infinite;
  will-change: transform;
}

.hero__thumb {
  height: 38vh;
  width: auto;
  object-fit: cover;
  filter: grayscale(0.3) contrast(1.05);
  flex: 0 0 auto;
}

@keyframes hero-drift {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}

.hero__scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(ellipse at center, rgba(14, 14, 14, 0.4) 0%, rgba(14, 14, 14, 0.82) 75%),
    linear-gradient(180deg, rgba(14, 14, 14, 0.55) 0%, rgba(14, 14, 14, 0.3) 40%, var(--color-bg) 100%);
}

.hero__inner {
  position: relative;
  z-index: 2;
  max-width: 44rem;
  margin: 0 auto;
  padding: 4rem 1.5rem;
  text-align: center;
}

.hero__kicker {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--color-muted);
  margin-bottom: 1.5rem;
}

.hero__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(3rem, 11vw, 7rem);
  line-height: 0.95;
  color: var(--color-text);
  margin: 0 0 1.5rem;
}

.hero__lede {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--color-text);
  opacity: 0.86;
  margin: 0 auto 2.25rem;
  max-width: 36rem;
}

.hero__enter {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: none;
  border: 1px solid var(--color-accent);
  padding: 0.65rem 1.4rem;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}
.hero__enter:hover { background: var(--color-accent); color: var(--color-bg); }

@media (prefers-reduced-motion: reduce) {
  .hero__track { animation: none; }
}

@media (max-width: 640px) {
  .hero__thumb { height: 26vh; }
  .hero__lede { font-size: 0.85rem; }
}
</style>
