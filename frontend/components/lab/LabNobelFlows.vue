<template>
  <div class="nf">
    <div class="nf__picker">
      <button
        v-for="q in quick"
        :key="q.value"
        type="button"
        class="nf__chip"
        :aria-pressed="selected === q.value"
        @click="selected = q.value"
      >
        {{ q.label }}
      </button>
      <label class="nf__select">
        <span class="visually-hidden">Choose a country</span>
        <select v-model="selected">
          <option :value="EVERYONE">Everyone</option>
          <option v-for="c in countryOptions" :key="c.name" :value="c.name">
            {{ c.name }} ({{ c.n }})
          </option>
        </select>
      </label>
    </div>

    <figure class="nf__map">
      <svg :viewBox="vb.join(' ')" role="img" :aria-label="mapLabel" :style="{ '--u': `${vb[2] / 1000}px` }">
        <defs>
          <marker id="nf-tip-out" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0L6,3L0,6Z" fill="var(--color-accent)" />
          </marker>
          <marker id="nf-tip-in" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0L6,3L0,6Z" :fill="GOLD" />
          </marker>
        </defs>
        <g class="nf__land">
          <path
            v-for="c in world.countries"
            :key="c.name"
            :d="c.d"
            :class="{ 'is-selected': c.name === selected }"
            vector-effect="non-scaling-stroke"
            @click="selectFromMap(c.name)"
          >
            <title>{{ c.name }}</title>
          </path>
        </g>
        <g :class="['nf__arcs', { 'nf__arcs--all': isAll }]">
          <path
            v-for="a in arcs"
            :key="a.key"
            :d="a.d"
            :stroke-width="a.w"
            vector-effect="non-scaling-stroke"
            :class="['nf__arc', `nf__arc--${a.type}`, { 'is-dim': hover && hover !== a.key, 'is-hot': hover === a.key }]"
            :marker-end="isAll ? undefined : `url(#nf-tip-${a.type})`"
            @mouseenter="hover = a.key"
            @mouseleave="hover = null"
          >
            <title>{{ a.from }} → {{ a.to }}: {{ a.names.join(', ') }}</title>
          </path>
        </g>
        <!-- One dot per prize won at home, in a little spiral around the country -->
        <g v-if="!isAll">
          <circle
            v-for="d in homeDots"
            :key="d.key"
            :cx="d.x"
            :cy="d.y"
            :r="vb[2] * 0.0055"
            :class="['nf__home', `nf__home--${d.kind}`, { 'is-dim': hover && hover !== d.key, 'is-hot': hover === d.key }]"
            @mouseenter="hover = d.key"
            @mouseleave="hover = null"
          >
            <title>{{ d.label }}</title>
          </circle>
        </g>
        <!-- Name labels at the far end of each group of arcs -->
        <g v-if="!isAll" class="nf__labels" :font-size="targetBox[2] * 0.016">
          <text
            v-for="l in labels"
            :key="l.key"
            :x="l.x"
            :y="l.y"
            :text-anchor="l.anchor"
            :class="`nf__label--${l.type}`"
          >
            <tspan :x="l.x" dy="0" class="nf__label-head">{{ l.head }}</tspan>
            <tspan v-for="(line, i) in l.lines" :key="i" :x="l.x" dy="1.25em">{{ line }}</tspan>
          </text>
        </g>
      </svg>
      <figcaption class="nf__legend">
        <template v-if="isAll">
          <span><i class="nf__key nf__key--out" /> born in one country, working in another when they won</span>
        </template>
        <template v-else>
          <span><i class="nf__key nf__key--out" /> born in {{ selected }}, won from abroad</span>
          <span><i class="nf__key nf__key--in" /> born abroad, won from {{ selected }}</span>
          <span><i class="nf__key nf__key--dot" /> won at home</span>
          <span><i class="nf__key nf__key--dot nf__key--peace" /> won at home, Peace or Literature</span>
        </template>
      </figcaption>
    </figure>

    <dl class="nf__stats">
      <div v-for="s in statTiles" :key="s.label">
        <dt class="text-label">{{ s.label }}</dt>
        <dd>{{ s.value }}</dd>
        <dd v-if="s.note" class="nf__note">{{ s.note }}</dd>
      </div>
    </dl>

    <p v-if="headline" class="nf__headline">{{ headline }}</p>

    <div class="nf__table-wrap">
      <table v-if="!isAll" class="nf__table">
        <thead>
          <tr>
            <th>Year</th><th>Laureate</th><th>Prize</th><th>Born</th><th>Working in</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in listRows"
            :key="rowKey(r)"
            :class="{ 'is-hot': hover === rowKey(r) }"
            @mouseenter="hover = rowKey(r)"
            @mouseleave="hover = null"
          >
            <td>{{ r.year }}</td>
            <td>{{ r.name }}</td>
            <td>{{ shortCat(r.cat) }}</td>
            <td>{{ r.b ?? '-' }}</td>
            <td>{{ r.w ?? '-' }}</td>
          </tr>
        </tbody>
      </table>
      <table v-else class="nf__table">
        <thead>
          <tr><th>From</th><th>To</th><th>Prizes</th></tr>
        </thead>
        <tbody>
          <tr
            v-for="a in topFlows"
            :key="a.key"
            :class="{ 'is-hot': hover === a.key }"
            @mouseenter="hover = a.key"
            @mouseleave="hover = null"
          >
            <td>{{ a.from }}</td><td>{{ a.to }}</td><td>{{ a.names.length }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NobelRow } from '~/types/lab'
import { toMapName } from '~/utils/lab-countries'

type P = [number, number]

interface World {
  width: number
  height: number
  countries: { name: string; d: string; c: P }[]
}

const props = withDefaults(defineProps<{
  rows: NobelRow[]
  world: World
  initial?: string
}>(), { initial: 'South Africa' })

const emit = defineEmits<{ 'update:selected': [country: string] }>()

const EVERYONE = '__everyone__'
const GOLD = '#E8C26A'
const SCIENCE = new Set(['Physics', 'Chemistry', 'Physiology or Medicine', 'Economic Sciences'])

const quick = [
  { label: 'South Africa', value: 'South Africa' },
  { label: 'Denmark', value: 'Denmark' },
  { label: 'Everyone', value: EVERYONE },
]
// A shared link says ?country=everyone for the all-laureates view.
const selected = ref(props.initial.toLowerCase() === 'everyone' ? EVERYONE : props.initial)
const isAll = computed(() => selected.value === EVERYONE)
watch(selected, (s) => emit('update:selected', s === EVERYONE ? 'everyone' : s), { immediate: true })
const hover = ref<string | null>(null)
watch(selected, () => { hover.value = null })

const centroids = computed(() => new Map(props.world.countries.map((c) => [c.name, c.c])))

const rows = computed(() => props.rows.map((r) => ({ ...r, b: toMapName(r.born), w: toMapName(r.won) })))
type Row = (typeof rows.value)[number]
const rowKey = (r: Pick<NobelRow, 'id' | 'year' | 'cat'>) => `${r.id}-${r.year}-${r.cat}`
// "F.W. de Klerk" -> "de Klerk", "Allan M. Cormack" -> "Cormack"
function surname(n: string) {
  const words = n.split(' ').filter((w) => !/^(jr\.?|sr\.?|[a-z]\.)+$/i.test(w))
  let i = words.length - 1
  while (i > 0 && /^(de|van|von|der|den|le|la|du|da|di|ter)$/i.test(words[i - 1])) i--
  return words.slice(i).join(' ') || n
}
const SHORT: Record<string, string> = { 'United States of America': 'USA', 'United Kingdom': 'UK' }
const short = (c: string) => SHORT[c] ?? c

const countryOptions = computed(() => {
  const n = new Map<string, number>()
  for (const r of rows.value) {
    for (const c of new Set([r.b, r.w])) if (c) n.set(c, (n.get(c) ?? 0) + 1)
  }
  return [...n].map(([name, k]) => ({ name, n: k })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
})

function selectFromMap(name: string) {
  if (countryOptions.value.some((c) => c.name === name)) selected.value = name
}

// ── Arcs ─────────────────────────────────────────────────────────────
// Outbound arcs bow north and inbound arcs bow south, so two countries trading
// laureates both ways get two separate curves. `bend` fans out several people
// travelling the same route.
function arcPath(a: P, b: P, south = false, bend = 0.22) {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const dist = Math.hypot(dx, dy) || 1
  let nx = -dy / dist
  let ny = dx / dist
  if ((ny > 0) !== south) { nx = -nx; ny = -ny }
  const k = dist * bend
  return `M${a[0]},${a[1]}Q${(mx + nx * k).toFixed(1)},${(my + ny * k).toFixed(1)} ${b[0]},${b[1]}`
}

interface Arc { key: string; from: string; to: string; type: 'out' | 'in'; names: string[]; d: string; w: number }

const moves = computed(() => rows.value.filter((r) => r.b && r.w && r.b !== r.w))

// Everyone view: one arc per country pair, thicker when more people took it.
const allFlows = computed(() => {
  const m = new Map<string, Arc>()
  for (const r of moves.value) {
    const a = centroids.value.get(r.b!)
    const b = centroids.value.get(r.w!)
    if (!a || !b) continue
    const key = `${r.b}|${r.w}`
    const arc = m.get(key) ?? { key, from: r.b!, to: r.w!, type: 'out' as const, names: [], d: arcPath(a, b), w: 0 }
    arc.names.push(`${r.name} (${r.year})`)
    m.set(key, arc)
  }
  return [...m.values()]
    .map((a) => ({ ...a, w: 0.8 + Math.log2(a.names.length) * 0.9 }))
    .sort((a, b) => b.names.length - a.names.length)
})
const topFlows = computed(() => allFlows.value.slice(0, 12))

// Country view: one arc per person, fanned out when they share a route.
const personArcs = computed<Arc[]>(() => {
  const X = selected.value
  const groups = new Map<string, Row[]>()
  for (const r of moves.value) {
    if (r.b !== X && r.w !== X) continue
    const key = `${r.b}|${r.w}`
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  const out: Arc[] = []
  for (const list of groups.values()) {
    list.forEach((r, i) => {
      const a = centroids.value.get(r.b!)
      const b = centroids.value.get(r.w!)
      if (!a || !b) return
      const type = r.b === X ? 'out' : 'in'
      const bend = 0.14 + (list.length > 1 ? (i / (list.length - 1)) * 0.2 : 0.08)
      out.push({ key: rowKey(r), from: r.b!, to: r.w!, type, names: [`${r.name} (${r.year})`], d: arcPath(a, b, type === 'in', bend), w: 1.6 })
    })
  }
  return out
})

const arcs = computed(() => (isAll.value ? [...allFlows.value].reverse() : personArcs.value))

// ── Home dots ────────────────────────────────────────────────────────
// Born here and either working here, or with no affiliation (most Peace and
// Literature laureates), counts as won at home.
const homeRows = computed(() =>
  rows.value.filter((r) => r.b === selected.value && (r.w === selected.value || !r.w)),
)
const homeDots = computed(() => {
  const c = centroids.value.get(selected.value)
  if (!c) return []
  const step = vb.value[2] * 0.016
  return homeRows.value.map((r, i) => {
    // Golden-angle spiral keeps dots evenly packed however many there are.
    const ang = i * 2.39996
    const rad = step * Math.sqrt(i + 0.6)
    return {
      key: rowKey(r),
      x: c[0] + Math.cos(ang) * rad,
      y: c[1] + Math.sin(ang) * rad,
      kind: SCIENCE.has(r.cat) ? 'sci' : 'peace',
      label: `${r.name}, ${shortCat(r.cat)} ${r.year}`,
    }
  })
})

// ── Labels ───────────────────────────────────────────────────────────
interface Label { key: string; x: number; y: number; anchor: string; type: string; head: string; lines: string[] }
const labels = computed<Label[]>(() => {
  const X = selected.value
  const c = centroids.value.get(X)
  if (!c) return []
  const out: Label[] = []
  const groups = new Map<string, Row[]>()
  for (const r of moves.value) {
    if (r.b !== X && r.w !== X) continue
    const other = r.b === X ? r.w! : r.b!
    const key = `${r.b === X ? 'out' : 'in'}|${other}`
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  // Lay out against where the zoom is heading, so labels do not jump about
  // while it animates, and keep every block inside the frame.
  const box = targetBox.value
  const fs = box[2] * 0.016
  const off = box[2] * 0.012
  const fit = (l: Label): Label => {
    const width = Math.max(l.head.length, ...l.lines.map((s) => s.length)) * fs * 0.62
    const height = (l.lines.length + 1) * fs * 1.25
    let { x, anchor, y } = l
    if (anchor === 'end' && x - width < box[0] + off) { anchor = 'start'; x = box[0] + off }
    if (anchor === 'start' && x + width > box[0] + box[2] - off) { anchor = 'end'; x = box[0] + box[2] - off }
    y = Math.min(Math.max(y, box[1] + fs * 1.5), box[1] + box[3] - height)
    return { ...l, x, y, anchor }
  }
  for (const [key, list] of groups) {
    const [type, other] = key.split('|')
    const p = centroids.value.get(other)
    if (!p) continue
    const right = p[0] >= c[0]
    const names = list.map((r) => `${surname(r.name)} ${r.year}`)
    out.push(fit({
      key,
      type,
      x: p[0] + (right ? off : -off),
      y: p[1] + (type === 'in' ? off * 2 : -off * (names.length + 0.5)),
      anchor: right ? 'start' : 'end',
      head: type === 'out' ? `to ${short(other)}` : `from ${short(other)}`,
      lines: names.length > 6 ? [...names.slice(0, 5), `+${names.length - 5} more`] : names,
    }))
  }
  if (homeRows.value.length) {
    const names = homeRows.value.map((r) => `${surname(r.name)} ${r.year}`)
    out.push(fit({
      key: 'home',
      type: 'home',
      // Clear of the dot spiral, whose radius grows with the square root of the count.
      x: c[0] + box[2] * 0.016 * Math.sqrt(homeRows.value.length + 0.6) + off,
      y: c[1] + off * 2,
      anchor: 'start',
      head: `won at home: ${names.length}`,
      lines: names.length > 8 ? [...names.slice(0, 7), `+${names.length - 7} more`] : names,
    }))
  }
  return out
})

// ── Zoom ─────────────────────────────────────────────────────────────
const FULL: [number, number, number, number] = [0, -40, props.world.width, props.world.height + 40]
const ASPECT = FULL[2] / FULL[3]

const targetBox = computed<[number, number, number, number]>(() => {
  if (isAll.value) return FULL
  const pts: P[] = []
  const c = centroids.value.get(selected.value)
  if (c) pts.push(c)
  for (const a of personArcs.value) {
    for (const n of [a.from, a.to]) {
      const p = centroids.value.get(n)
      if (p) pts.push(p)
    }
  }
  if (!pts.length) return FULL
  let x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]))
  let y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]))
  // Room for arcs bowing out, labels and the dot spiral.
  const padX = Math.max(80, (x1 - x0) * 0.22)
  const padY = Math.max(60, (y1 - y0) * 0.35)
  x0 -= padX; x1 += padX; y0 -= padY; y1 += padY
  let w = Math.max(x1 - x0, 320)
  let h = Math.max(y1 - y0, w / ASPECT)
  w = Math.max(w, h * ASPECT)
  h = w / ASPECT
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  if (w >= FULL[2]) return FULL
  return [cx - w / 2, cy - h / 2, w, h]
})

const vb = ref<[number, number, number, number]>([...targetBox.value])
let raf = 0
watch(targetBox, (to) => {
  cancelAnimationFrame(raf)
  const from = [...vb.value] as typeof to
  const reduced = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) { vb.value = [...to]; return }
  const t0 = performance.now()
  const tick = (now: number) => {
    const t = Math.min(1, (now - t0) / 700)
    const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
    vb.value = from.map((v, i) => v + (to[i] - v) * e) as typeof to
    if (t < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))

// ── Stats ────────────────────────────────────────────────────────────
const stats = computed(() => {
  const X = selected.value
  const born = rows.value.filter((r) => r.b === X)
  const away = born.filter((r) => r.w && r.w !== X)
  const gain = rows.value.filter((r) => r.w === X && r.b && r.b !== X)
  return { born: born.length, away: away.length, gain: gain.length, home: homeRows.value.length }
})

const everyoneStats = computed(() => {
  const withBoth = rows.value.filter((r) => r.b && r.w)
  return { total: rows.value.length, withBoth: withBoth.length, moved: moves.value.length }
})

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '-')

const statTiles = computed(() => {
  if (isAll.value) {
    const s = everyoneStats.value
    return [
      { label: 'Prizes to people', value: s.total.toLocaleString('en-GB') },
      { label: 'With a known workplace', value: s.withBoth.toLocaleString('en-GB') },
      { label: 'Working outside their birth country', value: pct(s.moved, s.withBoth), note: `${s.moved} prizes` },
    ]
  }
  const s = stats.value
  return [
    { label: `Born in ${selected.value}`, value: String(s.born), note: 'prizes, all categories' },
    { label: 'Won at home', value: String(s.home), note: 'incl. Peace and Literature' },
    { label: 'Won from abroad', value: String(s.away), note: s.born ? pct(s.away, s.born) : undefined },
    { label: 'Born elsewhere, won from here', value: String(s.gain) },
  ]
})

// Where the selected country's lines go: the top partners on each side.
function partners(list: Row[], key: 'b' | 'w') {
  const n = new Map<string, number>()
  for (const r of list) n.set(r[key]!, (n.get(r[key]!) ?? 0) + 1)
  const top = [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const shown = top.slice(0, 3).map(([c, k]) => `${c} (${k})`)
  const rest = top.length - shown.length
  if (rest) shown.push(`${rest} other ${rest === 1 ? 'country' : 'countries'}`)
  return shown.length > 1 ? `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}` : shown[0] ?? ''
}

const headline = computed(() => {
  if (isAll.value) return ''
  const X = selected.value
  const out = partners(rows.value.filter((r) => r.b === X && r.w && r.w !== X), 'w')
  const inn = partners(rows.value.filter((r) => r.w === X && r.b && r.b !== X), 'b')
  const parts: string[] = []
  if (out) parts.push(`Lines out of ${X} end in ${out}.`)
  if (inn) parts.push(`Lines into ${X} come from ${inn}.`)
  return parts.join(' ')
})

const listRows = computed(() => {
  const X = selected.value
  return rows.value.filter((r) => r.b === X || r.w === X)
})

function shortCat(c: string) {
  return c === 'Physiology or Medicine' ? 'Medicine' : c === 'Economic Sciences' ? 'Economics' : c
}

const mapLabel = computed(() =>
  isAll.value
    ? 'World map with arcs from each Nobel laureate\'s birth country to the country they were working in when they won'
    : `Map of Nobel laureates born in or working in ${selected.value}: arcs for those who moved, dots for those who won at home`,
)
</script>

<style scoped>
.nf__picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
}
.nf__chip,
.nf__select select {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  padding: 0.45rem 0.8rem;
  cursor: pointer;
}
.nf__select select {
  background: var(--color-surface);
  max-width: 100%;
}
.nf__chip[aria-pressed='true'] {
  border-color: var(--color-accent);
  background: var(--color-accent-dim);
}
.nf__chip:hover,
.nf__chip:focus-visible {
  border-color: var(--color-accent);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.nf__map {
  margin: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 0.75rem;
}
.nf__map svg {
  display: block;
  width: 100%;
  height: auto;
}
.nf__land path {
  fill: #232323;
  stroke: var(--color-bg);
  stroke-width: 0.5;
  cursor: pointer;
  transition: fill 0.15s;
}
.nf__land path:hover {
  fill: #2f2f2f;
}
.nf__land path.is-selected {
  fill: var(--color-accent-dim);
  stroke: var(--color-accent);
}
.nf__arc {
  fill: none;
  stroke-linecap: round;
  transition: opacity 0.15s;
}
.nf__arc--out {
  stroke: var(--color-accent);
  opacity: 0.75;
}
.nf__arc--in {
  stroke: #E8C26A;
  opacity: 0.8;
}
.nf__arcs--all .nf__arc--out {
  opacity: 0.28;
}
.nf__arc.is-dim {
  opacity: 0.12;
}
.nf__arc.is-hot {
  opacity: 1;
  stroke-width: 3;
}
.nf__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  margin-top: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-muted);
}
.nf__key {
  display: inline-block;
  width: 18px;
  height: 0;
  border-top: 2px solid;
  vertical-align: middle;
  margin-right: 0.4rem;
}
.nf__key--out { border-color: var(--color-accent); }
.nf__key--in { border-color: #E8C26A; }
.nf__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.5rem;
  margin: 1.5rem 0 0;
}
.nf__stats dt {
  margin-bottom: 0.3rem;
}
.nf__stats dd {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 2rem;
  line-height: 1.1;
}
.nf__stats dd.nf__note {
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: 0.75rem;
  color: var(--color-muted);
  margin-top: 0.2rem;
}
.nf__headline {
  font-family: var(--font-display);
  font-size: clamp(1.25rem, 3vw, 1.6rem);
  font-weight: 700;
  margin: 2rem 0 0;
  max-width: 720px;
}
.nf__table-wrap {
  margin-top: 2rem;
  overflow-x: auto;
}
.nf__table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 0.8rem;
}
.nf__table th {
  text-align: left;
  font-weight: 400;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-muted);
  padding: 0.5rem 1rem 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}
.nf__table td {
  padding: 0.55rem 1rem 0.55rem 0;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
.nf__table tr.is-hot td {
  color: var(--color-accent);
}

.nf__home {
  stroke: var(--color-surface);
  stroke-width: 0.6;
  vector-effect: non-scaling-stroke;
  transition: opacity 0.15s;
}
.nf__home--sci { fill: var(--color-text); }
.nf__home--peace { fill: #E8C26A; }
.nf__home.is-dim { opacity: 0.25; }
.nf__home.is-hot { stroke: var(--color-accent); stroke-width: 2; }
.nf__labels {
  font-family: var(--font-mono);
  pointer-events: none;
}
.nf__labels text {
  fill: var(--color-muted);
  paint-order: stroke;
  stroke: var(--color-surface);
  stroke-width: 3px;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
.nf__label-head {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.nf__label--out .nf__label-head { fill: var(--color-accent); }
.nf__label--in .nf__label-head { fill: #E8C26A; }
.nf__label--home .nf__label-head { fill: var(--color-text); }
.nf__key--dot {
  width: 9px;
  height: 9px;
  border: none;
  border-radius: 50%;
  background: var(--color-text);
}
.nf__key--peace { background: #E8C26A; }
/* Too small to read on a phone; the table below carries the names. */
@media (max-width: 600px) {
  .nf__labels {
    display: none;
  }
}
</style>
