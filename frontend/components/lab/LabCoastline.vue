<template>
  <div class="coast">
    <label class="lab-slider coast__slider">
      <span class="text-label">Ruler length</span>
      <input
        v-model.number="rulerLog"
        type="range"
        :min="Math.log10(minRuler)"
        :max="Math.log10(maxRuler)"
        step="0.01"
        :aria-valuetext="`${fmtRuler(ruler)} kilometres`"
      >
      <span class="lab-led coast__value">{{ fmtRuler(ruler) }} km</span>
    </label>

    <div class="coast__maps">
      <LabScreen v-for="(c, i) in countries" :key="c.name" page="103" :label="`Lab · ${c.name}`" class="coast__map">
        <template #readout>{{ fmtRuler(ruler) }} km ruler</template>
        <svg :viewBox="c.viewBox" class="coast__svg" role="img" :aria-label="`${c.name} coastline measured with a ${fmtRuler(ruler)} km ruler`" :style="{ '--glow': c.color }">
          <g transform="scale(1,-1)">
            <path :d="c.coastPath" class="coast__line" vector-effect="non-scaling-stroke" />
            <path :d="walkPath(current[i].walks)" class="coast__walk" :style="{ stroke: c.color }" vector-effect="non-scaling-stroke" />
            <template v-if="current[i].steps < 260">
              <template v-for="(w, wi) in current[i].walks" :key="wi">
                <circle
                  v-for="(p, pi) in w"
                  :key="pi"
                  :cx="p[0]"
                  :cy="p[1]"
                  :r="c.dot"
                  :style="{ fill: c.color }"
                />
              </template>
            </template>
            <!-- Scale bar: the ruler, at this map's scale -->
            <line
              :x1="c.bar[0]"
              :y1="c.bar[1]"
              :x2="c.bar[0] + Math.min(ruler, c.barMax)"
              :y2="c.bar[1]"
              class="coast__bar"
              vector-effect="non-scaling-stroke"
            />
          </g>
        </svg>
        <template #footer>
          <div class="coast__cap">
            <span class="coast__len" :style="{ color: c.color }">{{ fmtKm(current[i].length) }} km</span>
            <span class="coast__steps">{{ current[i].steps.toLocaleString('en-GB') }} steps × {{ fmtRuler(ruler) }} km</span>
          </div>
        </template>
      </LabScreen>
    </div>

    <LabScreen page="103" label="Lab · Length against ruler (log-log)" :graticule="false" class="coast__chart">
      <div class="coast__chart-pad">
      <svg ref="chartSvg" :viewBox="`0 0 ${CW} ${CH}`" class="coast__chart-svg" role="img" aria-label="Log-log chart: coastline length falls as the ruler gets longer, much faster for Denmark than for South Africa">
        <!-- grid -->
        <g class="coast__grid">
          <template v-for="r in xTicks" :key="`x${r}`">
            <line :x1="sx(r)" :x2="sx(r)" :y1="PT" :y2="CH - PB" />
            <text :x="sx(r)" :y="CH - PB + 18" text-anchor="middle">{{ r }}</text>
          </template>
          <template v-for="L in yTicks" :key="`y${L}`">
            <line :x1="PL" :x2="CW - PR" :y1="sy(L)" :y2="sy(L)" />
            <text :x="PL - 8" :y="sy(L) + 4" text-anchor="end">{{ fmtKm(L) }}</text>
          </template>
          <text :x="(PL + CW - PR) / 2" :y="CH - 4" text-anchor="middle">ruler (km)</text>
        </g>
        <line :x1="sx(ruler)" :x2="sx(ruler)" :y1="PT" :y2="CH - PB" class="coast__marker" />
        <g v-for="(c, i) in countries" :key="c.name">
          <path :d="curvePath(curves[i])" fill="none" :style="{ stroke: c.color, color: c.color }" stroke-width="2" />
          <circle :cx="sx(ruler)" :cy="sy(current[i].length)" r="4.5" :style="{ fill: c.color }" />
          <text
            :x="sx(minRuler) + 6"
            :y="sy(curves[i][0].L) - 10"
            class="coast__series"
            :style="{ fill: c.color }"
          >{{ c.name }} · D ≈ {{ dims[i].toFixed(2) }}</text>
        </g>
      </svg>
      </div>
    </LabScreen>
  </div>
</template>

<script setup lang="ts">
import { measure, fractalDimension } from '~/utils/lab-coastline'
import type { Pt } from '~/utils/lab-fourier'

interface Country {
  name: string
  color: string
  lines: Pt[][]
}

const props = withDefaults(defineProps<{
  countries: Country[]
  minRuler?: number
  maxRuler?: number
  defaultRuler?: number
}>(), {
  minRuler: 1,
  maxRuler: 200,
  defaultRuler: 50,
})

const emit = defineEmits<{ 'update:ruler': [ruler: number] }>()

const rulerLog = ref(Math.log10(props.defaultRuler))
const ruler = computed(() => 10 ** rulerLog.value)
watch(ruler, (r) => emit('update:ruler', r), { immediate: true })

const fmtKm = (v: number) => Math.round(v).toLocaleString('en-GB')
const fmtRuler = (r: number) => (r < 10 ? r.toFixed(1) : Math.round(r).toString())

// Static geometry per country: path, view box, dot size, scale bar position.
const countries = computed(() => props.countries.map((c) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const l of c.lines) for (const [x, y] of l) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  const w = maxX - minX, h = maxY - minY
  const pad = Math.max(w, h) * 0.05
  // y is flipped by the group transform, so the box spans -maxY .. -minY
  const viewBox = `${minX - pad} ${-maxY - pad} ${w + 2 * pad} ${h + 2 * pad}`
  const coastPath = c.lines.map((l) => 'M' + l.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L')).join('')
  return {
    ...c,
    viewBox,
    coastPath,
    dot: Math.max(w, h) / 220,
    bar: [minX, minY - pad * 0.5] as Pt,
    barMax: w,
  }
}))

const walkPath = (walks: Pt[][]) =>
  walks.filter((w) => w.length > 1).map((w) => 'M' + w.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L')).join('')

const current = computed(() => props.countries.map((c) => measure(c.lines, ruler.value)))

// Richardson curves, computed once.
const curves = computed(() => props.countries.map((c) => {
  const out: { r: number; L: number }[] = []
  const K = 36
  for (let k = 0; k <= K; k++) {
    const r = props.minRuler * (props.maxRuler / props.minRuler) ** (k / K)
    out.push({ r, L: measure(c.lines, r).length })
  }
  return out
}))
// Fit over 1-20 km, where every landmass on the map is still bigger than the ruler.
const dims = computed(() => curves.value.map((s) => fractalDimension(s.filter((p) => p.r <= 20))))

// ── Chart scales ─────────────────────────────────────────────────────
// The viewBox tracks the rendered width so one SVG unit stays one CSS pixel
// and the tick labels keep their size on a phone instead of shrinking with the chart.
const chartSvg = ref<SVGSVGElement | null>(null)
const CW = ref(720)
const CH = computed(() => Math.round(Math.min(340, Math.max(240, CW.value * 0.55))))
const PL = 64, PR = 16, PT = 16, PB = 40
let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(([e]) => { CW.value = Math.max(300, Math.round(e.contentRect.width)) })
  if (chartSvg.value) ro.observe(chartSvg.value)
})
onBeforeUnmount(() => ro?.disconnect())

const yMin = computed(() => Math.min(...curves.value.flat().map((p) => p.L).filter((v) => v > 0)) * 0.85)
const yMax = computed(() => Math.max(...curves.value.flat().map((p) => p.L)) * 1.15)
const sx = (r: number) => PL + (Math.log(r / props.minRuler) / Math.log(props.maxRuler / props.minRuler)) * (CW.value - PL - PR)
const sy = (L: number) => {
  const v = Math.max(L, yMin.value)
  return CH.value - PB - (Math.log(v / yMin.value) / Math.log(yMax.value / yMin.value)) * (CH.value - PT - PB)
}
const xTicks = computed(() => [1, 2, 5, 10, 20, 50, 100, 200].filter((r) => r >= props.minRuler && r <= props.maxRuler))
const yTicks = computed(() => [300, 500, 1000, 2000, 3000, 5000].filter((L) => L >= yMin.value && L <= yMax.value))
const curvePath = (s: { r: number; L: number }[]) =>
  'M' + s.map((p) => `${sx(p.r).toFixed(1)},${sy(p.L).toFixed(1)}`).join('L')
</script>

<style scoped>
.coast__slider {
  margin-bottom: 1.5rem;
}
.coast__maps {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.5rem;
}
@media (max-width: 700px) {
  .coast__maps {
    grid-template-columns: minmax(0, 1fr);
  }
}
.coast__cap {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 1rem;
}
.coast__len {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 10px currentColor;
}
.coast__steps {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-muted);
}
.coast__svg {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1.15;
  padding: 0.75rem;
}
.coast__line {
  fill: none;
  stroke: var(--color-text);
  stroke-width: 1;
  stroke-dasharray: 2 3;
  opacity: 0.3;
}
.coast__walk {
  fill: none;
  stroke-width: 1.6;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 3px var(--glow)) drop-shadow(0 0 1px var(--glow));
}
.coast__svg circle {
  filter: drop-shadow(0 0 2px var(--glow));
}
.coast__bar {
  stroke: var(--color-text);
  stroke-width: 3;
  filter: drop-shadow(0 0 3px rgba(240, 237, 230, 0.8));
}
.coast__chart {
  margin: 2rem 0 0;
}
.coast__chart-pad {
  padding: 0.75rem 0.5rem 0.25rem;
}
.coast__chart-svg {
  display: block;
  width: 100%;
  height: auto;
}
.coast__chart-svg path[fill='none'] {
  filter: drop-shadow(0 0 3px currentColor);
}
.coast__grid line {
  stroke: var(--lab-axis);
  stroke-width: 1;
}
.coast__grid text {
  fill: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 11px;
}
.coast__marker {
  stroke: var(--color-text);
  stroke-width: 1;
  stroke-dasharray: 3 4;
  opacity: 0.6;
}
.coast__series {
  font-family: var(--font-mono);
  font-size: 12px;
}
</style>
