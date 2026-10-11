<template>
  <figure class="epi">
    <div ref="wrap" class="epi__stage">
      <canvas ref="canvas" class="epi__canvas" role="img" :aria-label="ariaLabel" />
    </div>

    <div class="epi__controls">
      <label class="epi__slider">
        <span class="text-label">Arms per outline</span>
        <input
          v-model.number="stepIndex"
          type="range"
          min="0"
          :max="steps.length - 1"
          step="1"
          :aria-valuetext="`N = ${n}`"
        >
        <span class="epi__n">N = {{ n }}</span>
      </label>

      <div class="epi__buttons">
        <button type="button" class="epi__btn" @click="togglePlay">
          {{ playing ? 'Pause' : 'Play' }}
        </button>
        <button type="button" class="epi__btn" :aria-pressed="showArms" @click="showArms = !showArms">
          {{ showArms ? 'Hide arms' : 'Show arms' }}
        </button>
        <button type="button" class="epi__btn" :aria-pressed="showGhost" @click="showGhost = !showGhost">
          {{ showGhost ? 'Hide outline' : 'Show outline' }}
        </button>
      </div>
    </div>

    <dl class="epi__stats">
      <div>
        <dt class="text-label">Rotating arms</dt>
        <dd>{{ totalArms.toLocaleString('en-GB') }}</dd>
      </div>
      <div v-for="s in statRows" :key="s.name">
        <dt class="text-label">{{ s.name }} RMS error</dt>
        <dd>{{ s.err }}</dd>
      </div>
    </dl>
  </figure>
</template>

<script setup lang="ts">
import { dft, evaluate, rmsError, type Pt, type Term } from '~/utils/lab-fourier'

interface Shape {
  name: string
  pts: Pt[]
  color?: string
}

const props = withDefaults(defineProps<{
  shapes: Shape[]
  steps?: number[]
  defaultN?: number
  period?: number          // seconds per full drawing
  maxStatRows?: number
  ariaLabel?: string
}>(), {
  steps: () => [1, 2, 3, 5, 8, 13, 20, 30, 50, 80, 120, 150, 200, 300, 500, 800],
  defaultN: 150,
  period: 14,
  maxStatRows: 3,
  ariaLabel: 'An outline being drawn by chains of rotating circles',
})

const canvas = ref<HTMLCanvasElement | null>(null)
const wrap = ref<HTMLDivElement | null>(null)

const stepIndex = ref(Math.max(0, props.steps.indexOf(props.defaultN)))
const n = computed(() => props.steps[stepIndex.value])
const playing = ref(true)
const showArms = ref(true)
const showGhost = ref(true)

// Heavy maths happens client-side only, once per shape.
const spectra = shallowRef<Term[][]>([])
const paths = shallowRef<Pt[][]>([])
const errors = ref<number[]>([])

const totalArms = computed(() =>
  spectra.value.reduce((s, t) => s + Math.min(n.value, t.length), 0),
)
// Once N reaches the number of sample points the series passes through every one of them.
const fmtErr = (e: number) => (e < 0.005 ? 'exact' : `${e.toFixed(2)}%`)
const statRows = computed(() => {
  const rows = props.shapes.slice(0, props.maxStatRows).map((s, i) => ({
    name: s.name,
    err: errors.value[i] === undefined ? '-' : fmtErr(errors.value[i]),
  }))
  if (props.shapes.length > props.maxStatRows && errors.value.length) {
    const rest = errors.value.slice(props.maxStatRows)
    const mean = rest.reduce((a, b) => a + b, 0) / rest.length
    rows.push({ name: `Other ${rest.length}`, err: mean < 0.005 ? 'exact' : `${mean.toFixed(2)}% avg` })
  }
  return rows
})

function rebuildPaths() {
  const N = n.value
  paths.value = spectra.value.map((terms, i) => {
    const samples = Math.max(400, props.shapes[i].pts.length * 2)
    const out: Pt[] = []
    for (let j = 0; j <= samples; j++) out.push(evaluate(terms, N, j / samples))
    return out
  })
  errors.value = spectra.value.map((terms, i) => rmsError(props.shapes[i].pts, terms, N))
}

// ── View transform ───────────────────────────────────────────────────
let W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0
const toScreen = (p: Pt): Pt => [ox + p[0] * scale, oy - p[1] * scale]

function layout() {
  const el = wrap.value, cv = canvas.value
  if (!el || !cv) return
  let minX = 0, minY = 0, maxX = 0, maxY = 0  // include the hub at 0,0
  for (const s of props.shapes) for (const [x, y] of s.pts) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  const bw = maxX - minX, bh = maxY - minY
  W = el.clientWidth
  H = Math.min(window.innerHeight * 0.78, W * (bh / bw) + 40)
  const pad = 24
  scale = Math.min((W - 2 * pad) / bw, (H - 2 * pad) / bh)
  ox = W / 2 - ((minX + maxX) / 2) * scale
  oy = H / 2 + ((minY + maxY) / 2) * scale
  dpr = window.devicePixelRatio || 1
  cv.width = Math.round(W * dpr)
  cv.height = Math.round(H * dpr)
  cv.style.height = `${H}px`
}

// ── Animation ────────────────────────────────────────────────────────
let t = 0
let hold = 0
let last = 0
let raf = 0
let reduced = false

function cssVar(name: string, fallback: string) {
  if (!import.meta.client) return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function draw() {
  const cv = canvas.value
  if (!cv) return
  const ctx = cv.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)

  const accent = cssVar('--color-accent', '#D0243E')
  const border = cssVar('--color-border', '#2A2A2A')
  const text = cssVar('--color-text', '#F0EDE6')

  if (showGhost.value) {
    ctx.strokeStyle = border
    ctx.lineWidth = 1
    for (const s of props.shapes) {
      ctx.beginPath()
      s.pts.forEach((p, i) => {
        const [x, y] = toScreen(p)
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      })
      ctx.closePath()
      ctx.stroke()
    }
  }

  // Traces up to the current t
  ctx.lineWidth = 1.6
  ctx.lineJoin = 'round'
  paths.value.forEach((path, i) => {
    const upto = Math.floor(Math.min(1, t) * (path.length - 1))
    if (upto < 1) return
    ctx.strokeStyle = props.shapes[i].color || accent
    ctx.beginPath()
    for (let j = 0; j <= upto; j++) {
      const [x, y] = toScreen(path[j])
      j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
    }
    ctx.stroke()
  })

  if (showArms.value && t < 1) {
    for (let i = 0; i < spectra.value.length; i++) {
      const joints: Pt[] = []
      evaluate(spectra.value[i], n.value, t, [0, 0], joints)
      // Circles
      ctx.strokeStyle = 'rgba(240, 237, 230, 0.10)'
      ctx.lineWidth = 1
      for (let j = 1; j < joints.length - 1; j++) {
        const r = spectra.value[i][j].amp * scale
        if (r < 0.8) continue
        const [cx, cy] = toScreen(joints[j])
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      // Arms
      ctx.strokeStyle = 'rgba(240, 237, 230, 0.55)'
      ctx.beginPath()
      joints.forEach((p, j) => {
        const [x, y] = toScreen(p)
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      })
      ctx.stroke()
      // Pen tip
      const [tx, ty] = toScreen(joints[joints.length - 1])
      ctx.fillStyle = text
      ctx.beginPath()
      ctx.arc(tx, ty, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
    // Hub
    const [hx, hy] = toScreen([0, 0])
    ctx.fillStyle = text
    ctx.beginPath()
    ctx.arc(hx, hy, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function frame(now: number) {
  const dt = last ? (now - last) / 1000 : 0
  last = now
  if (playing.value) {
    if (t < 1) {
      t = Math.min(1, t + dt / props.period)
    } else {
      hold += dt
      if (hold > 2.5) { t = 0; hold = 0 }
    }
  }
  draw()
  raf = requestAnimationFrame(frame)
}

function togglePlay() {
  playing.value = !playing.value
  if (playing.value && t >= 1) { t = 0; hold = 0 }
}

watch(n, () => {
  rebuildPaths()
  if (reduced && !playing.value) t = 1
  else { t = 0; hold = 0 }
})
watch([showArms, showGhost], () => draw())

let ro: ResizeObserver | null = null
onMounted(() => {
  spectra.value = props.shapes.map((s) => dft(s.pts))
  rebuildPaths()
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) { playing.value = false; t = 1 }
  layout()
  ro = new ResizeObserver(() => { layout(); draw() })
  if (wrap.value) ro.observe(wrap.value)
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
})
</script>

<style scoped>
.epi {
  margin: 0;
}
.epi__stage {
  width: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
.epi__canvas {
  display: block;
  width: 100%;
}
.epi__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
}
.epi__slider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1 1 320px;
}
.epi__slider input {
  flex: 1;
  accent-color: var(--color-accent);
}
.epi__n {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  min-width: 5.5rem;
  text-align: right;
}
.epi__buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.epi__btn {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  padding: 0.4rem 0.75rem;
  cursor: pointer;
}
.epi__btn:hover,
.epi__btn:focus-visible {
  border-color: var(--color-accent);
}
.epi__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2.5rem;
  margin: 1.5rem 0 0;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}
.epi__stats dt {
  margin-bottom: 0.2rem;
}
.epi__stats dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.95rem;
}
</style>
