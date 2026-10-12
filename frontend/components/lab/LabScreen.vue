<template>
  <figure class="screen" :class="{ 'screen--on': on }">
    <div class="screen__spectrum" aria-hidden="true" />
    <header class="screen__bar">
      <span class="screen__page">P{{ page }}</span>
      <span class="screen__label">{{ label }}</span>
      <span v-if="$slots.readout" class="screen__readout"><slot name="readout" /></span>
      <time class="screen__clock" :datetime="iso" aria-hidden="true">{{ clock }}</time>
    </header>
    <div class="screen__tube">
      <div v-if="graticule" class="screen__graticule" aria-hidden="true" />
      <div class="screen__face">
        <slot />
      </div>
      <div class="screen__scan" aria-hidden="true" />
    </div>
    <footer v-if="$slots.footer" class="screen__foot">
      <slot name="footer" />
    </footer>
  </figure>
</template>

<script setup lang="ts">
// A 1980s instrument screen for the lab figures: teletext page header with a
// ticking clock, oscilloscope graticule behind the drawing, CRT scanlines and
// vignette over it, and the terminal's spectrum stripe down the left edge so
// the lab reads as part of the same machine as the home page terminal.
withDefaults(defineProps<{
  page: string | number   // teletext page number: 101..105
  label: string           // "LAB · FOURIER / ZA"
  graticule?: boolean     // oscilloscope grid behind the drawing
}>(), { graticule: true })

const on = ref(false)
const clock = ref('--:--:--')
const iso = ref('')
let timer = 0

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
function tick() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  clock.value = `${p(d.getDate())} ${MONTHS[d.getMonth()]} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  iso.value = d.toISOString()
}

onMounted(() => {
  tick()
  timer = window.setInterval(tick, 1000)
  requestAnimationFrame(() => { on.value = true })
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.screen {
  position: relative;
  margin: 0;
  background: var(--lab-screen, #060606);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

/* The terminal's spectrum stripe, same gradient, down the left edge. */
.screen__spectrum {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  z-index: 3;
  pointer-events: none;
  opacity: 0.55;
  background: linear-gradient(to bottom, #ff2020 0%, #ff6600 18%, #ffcc00 34%, #00cc44 50%, #0099ff 66%, #7733cc 82%, #ff0066 100%);
}

/* ── Teletext header ──────────────────────────────────────────────── */
.screen__bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0.9rem 0.45rem 1rem;
  background: #111;
  border-bottom: 1px solid var(--color-border);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
}
.screen__page {
  color: #fff;
  background: var(--color-accent);
  font-weight: 500;
  padding: 0.05rem 0.4rem;
  letter-spacing: 0.1em;
}
.screen__label {
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
}
.screen__readout {
  margin-left: auto;
  color: #E8C26A;
  overflow: hidden;
  text-overflow: ellipsis;
}
.screen__clock {
  margin-left: auto;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}
.screen__readout + .screen__clock {
  margin-left: 0;
}
@media (max-width: 600px) {
  .screen__clock,
  .screen__readout { display: none; }
}

/* ── The tube ─────────────────────────────────────────────────────── */
.screen__tube {
  position: relative;
  overflow: hidden;
}
.screen__graticule {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, var(--lab-axis, rgba(240, 237, 230, 0.09)) 1px, transparent 1px),
    linear-gradient(to bottom, var(--lab-axis, rgba(240, 237, 230, 0.09)) 1px, transparent 1px),
    linear-gradient(to right, var(--lab-grid, rgba(240, 237, 230, 0.045)) 1px, transparent 1px),
    linear-gradient(to bottom, var(--lab-grid, rgba(240, 237, 230, 0.045)) 1px, transparent 1px);
  background-size: 50% 100%, 100% 50%, 10% 10%, 10% 10%;
  background-position: 50% 0, 0 50%, -1px -1px, -1px -1px;
  background-repeat: no-repeat, no-repeat, repeat, repeat;
}
.screen__face {
  position: relative;
  transform: scaleY(0.004);
  filter: brightness(4);
  transform-origin: 50% 50%;
}
.screen--on .screen__face {
  animation: crt-on 520ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
}
@keyframes crt-on {
  0%   { transform: scaleY(0.004) scaleX(0.3); filter: brightness(6); }
  35%  { transform: scaleY(0.004) scaleX(1);   filter: brightness(6); }
  70%  { transform: scaleY(1) scaleX(1);       filter: brightness(1.8); }
  100% { transform: none;                      filter: none; }
}
@media (prefers-reduced-motion: reduce) {
  .screen__face { transform: none; filter: none; }
  .screen--on .screen__face { animation: none; }
}
.screen__scan {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  background:
    radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.55) 100%),
    repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0, 0, 0, 0.09) 2px, rgba(0, 0, 0, 0.09) 4px);
}

/* ── Footer readouts ──────────────────────────────────────────────── */
.screen__foot {
  position: relative;
  z-index: 3;
  border-top: 1px solid var(--color-border);
  background: #0b0b0b;
  padding: 0.55rem 0.9rem 0.55rem 1rem;
}
</style>
