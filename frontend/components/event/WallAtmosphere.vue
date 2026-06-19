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

const { x, y } = useMouse({ touch: false })

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

/* The moving spotlight mask. */
.atmos__spot {
  background: radial-gradient(
    circle 240px at var(--mx, 50%) var(--my, 50%),
    transparent 0,
    transparent 34%,
    rgba(8, 8, 8, 0.78) 78%
  );
  transition: background 60ms linear;
}

@media (prefers-reduced-motion: reduce) {
  .atmos__spot { transition: none; }
}
</style>
