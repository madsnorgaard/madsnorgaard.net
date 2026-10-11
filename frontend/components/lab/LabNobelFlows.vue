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
      <!-- Extra room on top so arcs bowing north over the Arctic are not clipped -->
      <svg :viewBox="`0 -40 ${world.width} ${world.height + 40}`" role="img" :aria-label="mapLabel">
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
            @click="selectFromMap(c.name)"
          >
            <title>{{ c.name }}</title>
          </path>
        </g>
        <g :class="['nf__arcs', { 'nf__arcs--all': selected === EVERYONE }]">
          <path
            v-for="a in arcs"
            :key="a.key"
            :d="a.d"
            :stroke-width="a.w"
            :class="['nf__arc', `nf__arc--${a.type}`, { 'is-dim': hover && hover !== a.key, 'is-hot': hover === a.key }]"
            :marker-end="selected === EVERYONE ? undefined : `url(#nf-tip-${a.type})`"
            @mouseenter="hover = a.key"
            @mouseleave="hover = null"
          >
            <title>{{ a.from }} → {{ a.to }}: {{ a.names.join(', ') }}</title>
          </path>
        </g>
        <circle
          v-if="selectedPoint && stats.stayed"
          :cx="selectedPoint[0]"
          :cy="selectedPoint[1]"
          :r="3 + Math.sqrt(stats.stayed) * 2.2"
          class="nf__stay"
        />
      </svg>
      <figcaption class="nf__legend">
        <template v-if="selected === EVERYONE">
          <span><i class="nf__key nf__key--out" /> born in one country, working in another when they won</span>
        </template>
        <template v-else>
          <span><i class="nf__key nf__key--out" /> born in {{ selected }}, won from abroad</span>
          <span><i class="nf__key nf__key--in" /> born abroad, won from {{ selected }}</span>
          <span><i class="nf__key nf__key--stay" /> born and won at home</span>
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
      <table v-if="selected !== EVERYONE" class="nf__table">
        <thead>
          <tr>
            <th>Year</th><th>Laureate</th><th>Prize</th><th>Born</th><th>Working in</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in listRows"
            :key="`${r.id}-${r.year}`"
            :class="{ 'is-hot': hover === pairKey(r) }"
            @mouseenter="hover = pairKey(r)"
            @mouseleave="hover = null"
          >
            <td>{{ r.year }}</td>
            <td>{{ r.name }}</td>
            <td>{{ shortCat(r.cat) }}</td>
            <td>{{ toMapName(r.born) ?? '-' }}</td>
            <td>{{ toMapName(r.won) ?? '-' }}</td>
          </tr>
        </tbody>
      </table>
      <table v-else class="nf__table">
        <thead>
          <tr><th>From</th><th>To</th><th>Laureates</th></tr>
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

interface World {
  width: number
  height: number
  countries: { name: string; d: string; c: [number, number] }[]
}

const props = withDefaults(defineProps<{
  rows: NobelRow[]
  world: World
  initial?: string
}>(), { initial: 'South Africa' })

const EVERYONE = '__everyone__'
const GOLD = '#E8C26A'
const SCIENCE = new Set(['Physics', 'Chemistry', 'Physiology or Medicine', 'Economic Sciences'])

const quick = [
  { label: 'South Africa', value: 'South Africa' },
  { label: 'Denmark', value: 'Denmark' },
  { label: 'Everyone', value: EVERYONE },
]
const selected = ref(props.initial)
const hover = ref<string | null>(null)
watch(selected, () => { hover.value = null })

const centroids = computed(() => new Map(props.world.countries.map((c) => [c.name, c.c])))
const selectedPoint = computed(() => centroids.value.get(selected.value))

// Rows with both ends resolved to map names.
const rows = computed(() => props.rows.map((r) => ({ ...r, b: toMapName(r.born), w: toMapName(r.won) })))

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

const pairKey = (r: { born: string | null; won: string | null }) => `${toMapName(r.born)}|${toMapName(r.won)}`

// ── Arcs ─────────────────────────────────────────────────────────────
function arcPath(a: [number, number], b: [number, number], south = false) {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const dist = Math.hypot(dx, dy)
  // Perpendicular offset: outbound arcs bow north, inbound arcs bow south, so a
  // pair of countries trading laureates both ways shows two separate curves.
  let nx = -dy / dist
  let ny = dx / dist
  if ((ny > 0) !== south) { nx = -nx; ny = -ny }
  const k = dist * 0.22
  return `M${a[0]},${a[1]}Q${(mx + nx * k).toFixed(1)},${(my + ny * k).toFixed(1)} ${b[0]},${b[1]}`
}

interface Arc { key: string; from: string; to: string; type: 'out' | 'in'; names: string[]; d: string; w: number }

const moves = computed(() => rows.value.filter((r) => r.b && r.w && r.b !== r.w))

function aggregate(list: typeof moves.value, type: (r: (typeof moves.value)[number]) => 'out' | 'in'): Arc[] {
  const m = new Map<string, Arc>()
  for (const r of list) {
    const a = centroids.value.get(r.b!)
    const b = centroids.value.get(r.w!)
    if (!a || !b) continue
    const key = `${r.b}|${r.w}`
    const t = type(r)
    const arc = m.get(key) ?? { key, from: r.b!, to: r.w!, type: t, names: [], d: arcPath(a, b, t === 'in'), w: 0 }
    arc.names.push(`${r.name} (${r.year})`)
    m.set(key, arc)
  }
  return [...m.values()].map((a) => ({ ...a, w: 1 + Math.log2(a.names.length) * 1.1 }))
}

const allFlows = computed(() => aggregate(moves.value, () => 'out').sort((a, b) => b.names.length - a.names.length))
const topFlows = computed(() => allFlows.value.slice(0, 12))

const arcs = computed(() => {
  if (selected.value === EVERYONE) return [...allFlows.value].reverse()
  const X = selected.value
  return aggregate(moves.value.filter((r) => r.b === X || r.w === X), (r) => (r.b === X ? 'out' : 'in'))
})

// ── Stats ────────────────────────────────────────────────────────────
const stats = computed(() => {
  const X = selected.value
  const born = rows.value.filter((r) => r.b === X)
  const sci = born.filter((r) => SCIENCE.has(r.cat) && r.w)
  const sciAbroad = sci.filter((r) => r.w !== X)
  const gain = rows.value.filter((r) => r.w === X && r.b && r.b !== X)
  const stayed = born.filter((r) => r.w === X).length
  return { born: born.length, sci: sci.length, sciAbroad: sciAbroad.length, gain: gain.length, stayed }
})

const everyoneStats = computed(() => {
  const withBoth = rows.value.filter((r) => r.b && r.w)
  return { total: rows.value.length, withBoth: withBoth.length, moved: moves.value.length }
})

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '-')

const statTiles = computed(() => {
  if (selected.value === EVERYONE) {
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
    { label: 'Science prizes won abroad', value: s.sci ? `${s.sciAbroad} of ${s.sci}` : '-', note: s.sci ? pct(s.sciAbroad, s.sci) : 'no science laureates' },
    { label: 'Won from here, born elsewhere', value: String(s.gain) },
  ]
})

const headline = computed(() => {
  if (selected.value === EVERYONE) return ''
  const s = stats.value
  if (!s.sci) return ''
  if (s.sciAbroad === s.sci) return `Every ${selected.value}-born science laureate was working abroad when they won.`
  if (s.sciAbroad === 0) return `Every ${selected.value}-born science laureate won from home.`
  return ''
})

const listRows = computed(() => {
  const X = selected.value
  return rows.value.filter((r) => r.b === X || r.w === X)
})

const shortCat = (c: string) => (c === 'Physiology or Medicine' ? 'Medicine' : c === 'Economic Sciences' ? 'Economics' : c)

const mapLabel = computed(() =>
  selected.value === EVERYONE
    ? 'World map with arcs from each Nobel laureate\'s birth country to the country they were working in when they won'
    : `World map with arcs to and from ${selected.value} for Nobel laureates born or working there`,
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
.nf__stay {
  fill: none;
  stroke: var(--color-text);
  stroke-width: 1.5;
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
.nf__key--stay {
  width: 10px;
  height: 10px;
  border: 1.5px solid var(--color-text);
  border-radius: 50%;
}
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
</style>
