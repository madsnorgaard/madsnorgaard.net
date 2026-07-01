<template>
  <!-- Always-on faint grain + vignette to tie the wall to the CRT lightbox. -->
  <div class="atmos atmos__grain" aria-hidden="true" />

  <!-- Darkroom spotlight: a pool of light follows the cursor, the rest sinks
       into the dark. Desktop pointers only; respects reduced-motion. -->
  <div
    v-if="spotlight && finePointer"
    class="atmos atmos__spot"
    aria-hidden="true"
    :style="spotStyle"
  />
</template>

<script setup lang="ts">
const props = defineProps<{ spotlight: boolean }>()

// `type: 'client'` => viewport coordinates. The spot overlay is position:fixed,
// so it must track the cursor relative to the viewport; the default 'page'
// coords include scrollY, which pushed the light pool off the bottom of the
// screen as soon as you scrolled down the wall.
const { x, y } = useMouse({ touch: false, type: 'client' })

// Only enable the spotlight for fine pointers (mouse/trackpad).
const finePointer = ref(false)
onMounted(() => {
  finePointer.value = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false
})

const spotStyle = computed(() => ({
  '--mx': `${x.value}px`,
  '--my': `${y.value}px`,
}))
</script>

<style scoped>
.atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 80; /* above wall tiles, below header(100)/mix(200)/lightbox(9000) */
}

/* Faint film grain (scanline noise) + corner vignette. */
.atmos__grain {
  z-index: 70;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, 0.006) 2px,
      rgba(255, 255, 255, 0.006) 3px
    ),
    radial-gradient(ellipse at center, transparent 55%, rgba(8, 8, 8, 0.45) 100%);
}

/* The moving spotlight: a warm pool of light at the cursor, the rest of the
   wall sinking into near-black. Two layers - a soft amber bloom in the clear
   centre, and the darkening surround. */
.atmos__spot {
  background:
    radial-gradient(
      circle 260px at var(--mx, 50%) var(--my, 50%),
      rgba(255, 210, 160, 0.06) 0,
      rgba(255, 210, 160, 0.02) 22%,
      transparent 40%
    ),
    radial-gradient(
      circle 260px at var(--mx, 50%) var(--my, 50%),
      transparent 0,
      transparent 30%,
      rgba(6, 6, 6, 0.7) 62%,
      rgba(4, 4, 4, 0.88) 82%
    );
  transition: background 70ms linear;
  will-change: background;
}

@media (prefers-reduced-motion: reduce) {
  .atmos__spot { transition: none; }
}
</style>
