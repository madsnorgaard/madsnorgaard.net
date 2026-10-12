<template>
  <figure class="pad">
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
      <p v-if="!hasStroke" class="pad__hint">Draw a closed shape here in one stroke</p>
    </div>
    <div class="pad__buttons">
      <button v-for="(p, key) in presets" :key="key" type="button" class="pad__btn" @click="emit('preset', String(key))">
        {{ p.label }}
      </button>
      <button type="button" class="pad__btn" :disabled="!hasStroke" @click="clear">Clear</button>
    </div>
  </figure>
</template>

<script setup lang="ts">
import type { Pt } from '~/utils/lab-fourier'
import { PRESETS } from '~/utils/lab-sketch'

const emit = defineEmits<{ stroke: [pts: Pt[]]; preset: [key: string]; clear: [] }>()
const presets = PRESETS

const canvas = ref<HTMLCanvasElement | null>(null)
const wrap = ref<HTMLDivElement | null>(null)
const hasStroke = ref(false)

let pts: Pt[] = []
let drawing = false
let dpr = 1

function layout() {
  const el = wrap.value, cv = canvas.value
  if (!el || !cv) return
  dpr = window.devicePixelRatio || 1
  const w = el.clientWidth
  const h = Math.min(window.innerHeight * 0.6, Math.max(260, w * 0.7))
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
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim() || '#F0EDE6'
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  if (!drawing) ctx.closePath()
  ctx.stroke()
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
  canvas.value?.setPointerCapture(e.pointerId)
  paint()
}
function move(e: PointerEvent) {
  if (!drawing) return
  pts.push(pos(e))
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
.pad {
  margin: 0;
}
.pad__stage {
  position: relative;
  width: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
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
  font-size: 0.85rem;
  color: var(--color-muted);
}
.pad__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
.pad__btn {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  padding: 0.4rem 0.75rem;
  cursor: pointer;
}
.pad__btn:hover,
.pad__btn:focus-visible {
  border-color: var(--color-accent);
}
.pad__btn:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
