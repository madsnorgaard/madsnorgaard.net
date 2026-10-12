<template>
  <div class="pad">
    <LabScreen page="105" label="Lab · Light pen">
      <template #readout>{{ hasStroke ? `${count} pts` : 'ready' }}</template>
      <div ref="wrap" class="pad__stage" :class="{ 'is-empty': !hasStroke }">
        <canvas
          ref="canvas"
          class="pad__canvas"
          role="img"
          aria-label="Drawing pad: draw a closed shape in one stroke"
          @pointerdown="start"
          @pointermove="move"
          @pointerup="finish"
          @pointercancel="finish"
          @pointerleave="finish"
        />
        <p v-if="!hasStroke" class="pad__hint">Draw a closed shape here in one stroke<span class="pad__cursor" aria-hidden="true" /></p>
      </div>
    </LabScreen>
    <div class="pad__buttons">
      <button v-for="(p, key) in presets" :key="key" type="button" class="lab-btn" @click="emit('preset', String(key))">
        <span class="lab-btn__glyph" aria-hidden="true">{{ p.glyph }}</span>{{ p.label }}
      </button>
      <button type="button" class="lab-btn" :disabled="!hasStroke" @click="clear">
        <span class="lab-btn__glyph" aria-hidden="true">■</span>Clear
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Pt } from '~/utils/lab-fourier'
import { PRESETS } from '~/utils/lab-sketch'
import { beamPath, beamDot } from '~/utils/lab-beam'

const emit = defineEmits<{ stroke: [pts: Pt[]]; preset: [key: string]; clear: [] }>()
const presets = PRESETS

const canvas = ref<HTMLCanvasElement | null>(null)
const wrap = ref<HTMLDivElement | null>(null)
const hasStroke = ref(false)
const count = ref(0)

let pts: Pt[] = []
let drawing = false
let dpr = 1
let lastW = 0, lastH = 0

function layout() {
  const el = wrap.value, cv = canvas.value
  if (!el || !cv) return
  dpr = window.devicePixelRatio || 1
  const w = el.clientWidth
  const h = Math.min(window.innerHeight * 0.6, Math.max(260, w * 0.7))
  // The pad shrinks when the machine appears beside it: keep the stroke in place.
  if (lastW && lastH && (w !== lastW || h !== lastH)) {
    pts = pts.map(([x, y]) => [(x / lastW) * w, (y / lastH) * h])
  }
  lastW = w; lastH = h
  cv.width = Math.round(w * dpr)
  cv.height = Math.round(h * dpr)
  cv.style.height = `${h}px`
  paint()
}

function paint() {
  const cv = canvas.value
  if (!cv) return
  const ctx = cv.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cv.width, cv.height)
  if (pts.length < 2) return
  const color = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim() || '#F0EDE6'
  beamPath(ctx, pts, color, { width: 1.8, close: !drawing })
  if (drawing) {
    const [x, y] = pts[pts.length - 1]
    beamDot(ctx, x, y, 2.4, color, true)
  }
}

const pos = (e: PointerEvent): Pt => {
  const r = canvas.value!.getBoundingClientRect()
  return [e.clientX - r.left, e.clientY - r.top]
}

function start(e: PointerEvent) {
  if (e.button !== 0 && e.pointerType === 'mouse') return
  drawing = true
  pts = [pos(e)]
  hasStroke.value = true
  count.value = 1
  canvas.value?.setPointerCapture(e.pointerId)
  paint()
}
function move(e: PointerEvent) {
  if (!drawing) return
  pts.push(pos(e))
  count.value = pts.length
  paint()
}
function finish() {
  if (!drawing) return
  drawing = false
  paint()
  if (pts.length >= 3) emit('stroke', pts.slice())
}
function clear() {
  pts = []
  hasStroke.value = false
  count.value = 0
  paint()
  emit('clear')
}

// Show a preset or a shared drawing on the pad (outline coords, y up).
function show(outline: Pt[]) {
  const cv = canvas.value
  if (!cv) return
  const w = cv.width / dpr, h = cv.height / dpr
  let r = 1
  for (const [x, y] of outline) r = Math.max(r, Math.abs(x), Math.abs(y))
  const s = (Math.min(w, h) * 0.42) / r
  pts = outline.map(([x, y]) => [w / 2 + x * s, h / 2 - y * s])
  hasStroke.value = pts.length > 0
  count.value = pts.length
  drawing = false
  paint()
}
defineExpose({ show, clear })

let ro: ResizeObserver | null = null
onMounted(() => {
  layout()
  ro = new ResizeObserver(() => layout())
  if (wrap.value) ro.observe(wrap.value)
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<style scoped>
.pad__stage {
  position: relative;
  width: 100%;
}
.pad__canvas {
  display: block;
  width: 100%;
  touch-action: none;
  cursor: crosshair;
}
.pad__hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  pointer-events: none;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.pad__cursor {
  display: inline-block;
  width: 0.55em;
  height: 1em;
  margin-left: 0.3em;
  background: var(--color-accent);
  vertical-align: text-bottom;
  animation: pad-blink 1s step-end infinite;
}
@keyframes pad-blink {
  50% { opacity: 0; }
}
.pad__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
