<template>
  <div class="epi">
    <LabScreen :page="page" :label="label">
      <template #readout>N={{ n }} · {{ totalArms.toLocaleString('en-GB') }} arms</template>
      <div ref="wrap" class="epi__stage">
        <canvas ref="canvas" class="epi__canvas" role="img" :aria-label="ariaLabel" />
      </div>
      <template #footer>
        <dl class="lab-readouts epi__stats">
          <div>
            <dt>Rotating arms</dt>
            <dd>{{ totalArms.toLocaleString('en-GB') }}</dd>
          </div>
          <div v-for="s in statRows" :key="s.name">
            <dt>{{ s.name }} RMS error</dt>
            <dd>{{ s.err }}</dd>
          </div>
        </dl>
      </template>
    </LabScreen>

    <div class="epi__controls">
      <label class="lab-slider epi__slider">
        <span class="text-label">Arms per outline</span>
        <input
          v-model.number="stepIndex"
          type="range"
          min="0"
          :max="steps.length - 1"
          step="1"
          :aria-valuetext="`N = ${n}`"
        >
        <span class="lab-led epi__n">N = {{ n }}</span>
      </label>

      <div class="epi__buttons">
        <button type="button" class="lab-btn" :class="{ 'lab-btn--lit': playing }" @click="togglePlay">
          <span class="lab-btn__glyph" aria-hidden="true">{{ playing ? '❚❚' : '▶' }}</span>{{ playing ? 'Pause' : 'Play' }}
        </button>
        <button type="button" class="lab-btn" :aria-pressed="showArms" @click="showArms = !showArms">
          <span class="lab-btn__glyph" aria-hidden="true">◎</span>{{ showArms ? 'Hide arms' : 'Show arms' }}
        </button>
        <button type="button" class="lab-btn" :aria-pressed="showGhost" @click="showGhost = !showGhost">
          <span class="lab-btn__glyph" aria-hidden="true">▢</span>{{ showGhost ? 'Hide outline' : 'Show outline' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { dft, evaluate, rmsError, EPI_STEPS, type Pt, type Term } from '~/utils/lab-fourier'
import { beamPath, beamDot, SCREEN } from '~/utils/lab-beam'

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
  page?: string | number   // teletext page number on the screen header
  label?: string
}>(), {
  steps: () => EPI_STEPS,
  defaultN: 150,
  period: 14,
  maxStatRows: 3,
  ariaLabel: 'An outline being drawn by chains of rotating circles',
  page: '101',
  label: 'Lab · Fourier',
})

const emit = defineEmits<{ 'update:n': [n: number] }>()

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
  const pad = 28
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
  const text = cssVar('--color-text', '#F0EDE6')

  // The target outline as a faint dotted burn-in behind the beam.
  if (showGhost.value) {
    ctx.strokeStyle = SCREEN.ghost
    ctx.lineWidth = 1
    ctx.setLineDash([2, 4])
    for (const s of props.shapes) {
      ctx.beginPath()
      s.pts.forEach((p, i) => {
        const [x, y] = toScreen(p)
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      })
      ctx.closePath()
      ctx.stroke()
    }
    ctx.setLineDash([])
  }

  // Traces up to the current t: a glowing beam, white-hot where it is freshest.
  paths.value.forEach((path, i) => {
    const upto = Math.floor(Math.min(1, t) * (path.length - 1))
    if (upto < 1) return
    const color = props.shapes[i].color || accent
    const pts: Pt[] = []
    for (let j = 0; j <= upto; j++) pts.push(toScreen(path[j]))
    beamPath(ctx, pts, color, { width: 1.5, alpha: 0.9 })
    if (t < 1) {
      const from = Math.max(0, upto - Math.ceil(path.length * 0.04))
      beamPath(ctx, pts.slice(from), color, { width: 1.8, bloom: 1.6, hot: true })
    }
  })

  if (showArms.value && t < 1) {
    for (let i = 0; i < spectra.value.length; i++) {
      const joints: Pt[] = []
      evaluate(spectra.value[i], n.value, t, [0, 0], joints)
      // Circles
      ctx.strokeStyle = SCREEN.circle
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
      ctx.strokeStyle = SCREEN.arm
      ctx.lineWidth = 1
      ctx.beginPath()
      joints.forEach((p, j) => {
        const [x, y] = toScreen(p)
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      })
      ctx.stroke()
      // Pen tip: the hot spot of the beam
      const [tx, ty] = toScreen(joints[joints.length - 1])
      beamDot(ctx, tx, ty, 2.4, props.shapes[i].color || accent, true)
    }
    // Hub
    const [hx, hy] = toScreen([0, 0])
    beamDot(ctx, hx, hy, 2.2, text)
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

watch(n, (v) => emit('update:n', v), { immediate: true })
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
.epi__stage {
  width: 100%;
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
  flex: 1 1 320px;
}
.epi__buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
