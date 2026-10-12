// 1200x630 share cards for the /lab experiments. Each builder draws the
// experiment's graphic as a plain SVG (explicit colours, no CSS variables, no
// text) from the same data the page uses, and the frame adds the title and
// numbers with Satori. The state a visitor can change on the page (arm count,
// ruler length, Nobel country) comes in as query parameters so a shared link
// previews exactly what they were looking at.

import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { loadOgFonts } from './og-fonts'
import { dft, evaluate, rmsError, snapN, type Pt, type Term } from '../../utils/lab-fourier'
import { DRAW_STEPS, PRESETS, decodeOutline } from '../../utils/lab-sketch'
import { measure, clampRuler } from '../../utils/lab-coastline'
import { toMapName } from '../../utils/lab-countries'
import type { NobelRow, WorldMap } from '../../types/lab'
import dkData from '../../public/lab-data/dk.json'
import zaData from '../../public/lab-data/za.json'
import worldData from '../../public/lab-data/world.json'

const C = {
  bg: '#0E0E0E',
  surface: '#161616',
  border: '#2A2A2A',
  land: '#232323',
  text: '#F0EDE6',
  muted: '#8C8680',
  accent: '#D0243E',
  accentDim: 'rgba(208, 36, 62, 0.15)',
  gold: '#E8C26A',
}

// The graphic sits in a bordered box on the right of the card.
const BOX = { x: 520, y: 56, w: 624, h: 518 }

export type LabSlug = 'fourier-south-africa' | 'fourier-denmark' | 'coastline-paradox' | 'nobel-lines' | 'draw'
export const LAB_SLUGS: LabSlug[] = ['fourier-south-africa', 'fourier-denmark', 'coastline-paradox', 'nobel-lines', 'draw']

export interface CardSpec {
  kicker: string
  title: string
  stats: { label: string; value: string; color?: string }[]
  svg: string  // inner SVG markup, drawn into a BOX.w x BOX.h viewBox
}

export interface CardQuery {
  n?: unknown
  ruler?: unknown
  country?: unknown
  d?: unknown
}

const fmt = (v: number) => Math.round(v).toLocaleString('en-GB')
const px = (p: number, scale: number) => p / scale  // stroke width in user units for p screen pixels
const poly = (pts: Pt[]) => pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L')

// Fit a bounding box (math coords, y up) into the graphic box with padding.
// Returns a transform string plus the scale, so stroke widths can stay in pixels.
function fit(minX: number, minY: number, maxX: number, maxY: number, w = BOX.w, h = BOX.h, pad = 28) {
  const bw = maxX - minX || 1
  const bh = maxY - minY || 1
  const scale = Math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh)
  const tx = w / 2 - ((minX + maxX) / 2) * scale
  const ty = h / 2 + ((minY + maxY) / 2) * scale
  return { scale, transform: `translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(5)},${(-scale).toFixed(5)})` }
}

// ── Fourier epicycles ────────────────────────────────────────────────
const spectrumCache = new Map<string, Term[]>()
function spectrum(key: string, pts: Pt[]): Term[] {
  let t = spectrumCache.get(key)
  if (!t) { t = dft(pts); spectrumCache.set(key, t) }
  return t
}

interface EpiShape { name: string; pts: Pt[]; color: string }

// The epicycle drawing shared by the three machine cards: ghost outline,
// trace up to t, arms and circles at t, plus arm count and error stats.
function epicycleSpec(cacheKey: string, shapes: EpiShape[], n: number, head: Pick<CardSpec, 'kicker' | 'title'>): CardSpec {
  const t = 0.72  // mid-drawing, so the arms are out and most of the outline is in

  let minX = 0, minY = 0, maxX = 0, maxY = 0
  for (const s of shapes) for (const [x, y] of s.pts) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  const { scale, transform } = fit(minX, minY, maxX, maxY)

  let totalArms = 0
  const parts: string[] = []
  const ghosts: string[] = []
  const errors: number[] = []
  shapes.forEach((s, i) => {
    const terms = cacheKey ? spectrum(`${cacheKey}:${i}`, s.pts) : dft(s.pts)
    totalArms += Math.min(n, terms.length)
    errors.push(rmsError(s.pts, terms, n))
    ghosts.push(`<path d="M${poly(s.pts)}Z" fill="none" stroke="${C.border}" stroke-width="${px(1, scale)}"/>`)
    const samples = Math.max(400, s.pts.length * 2)
    const upto = Math.floor(t * samples)
    const trace: Pt[] = []
    for (let j = 0; j <= upto; j++) trace.push(evaluate(terms, n, j / samples))
    parts.push(`<path d="M${poly(trace)}" fill="none" stroke="${s.color}" stroke-width="${px(1.8, scale)}" stroke-linejoin="round"/>`)
    const joints: Pt[] = []
    evaluate(terms, n, t, [0, 0], joints)
    const circles: string[] = []
    for (let j = 1; j < joints.length - 1; j++) {
      const r = terms[j].amp
      if (r * scale < 0.8) continue
      circles.push(`<circle cx="${joints[j][0].toFixed(2)}" cy="${joints[j][1].toFixed(2)}" r="${r.toFixed(2)}"/>`)
    }
    parts.push(`<g fill="none" stroke="rgba(240,237,230,0.10)" stroke-width="${px(1, scale)}">${circles.join('')}</g>`)
    parts.push(`<path d="M${poly(joints)}" fill="none" stroke="rgba(240,237,230,0.55)" stroke-width="${px(1, scale)}"/>`)
    const tip = joints[joints.length - 1]
    parts.push(`<circle cx="${tip[0].toFixed(2)}" cy="${tip[1].toFixed(2)}" r="${px(2.5, scale)}" fill="${C.text}"/>`)
  })
  parts.push(`<circle cx="0" cy="0" r="${px(3, scale)}" fill="${C.text}"/>`)

  const err = (e: number) => (e < 0.005 ? 'exact' : `${e.toFixed(2)}%`)
  return {
    ...head,
    stats: [
      { label: 'Arms per outline', value: `N = ${n}` },
      { label: 'Rotating arms', value: fmt(totalArms) },
      { label: `${shapes[0].name} RMS error`, value: err(errors[0]) },
    ],
    svg: `<g transform="${transform}">${ghosts.join('')}${parts.join('')}</g>`,
  }
}

function fourierCard(slug: 'fourier-south-africa' | 'fourier-denmark', q: CardQuery): CardSpec {
  const za = slug === 'fourier-south-africa'
  const shapes: EpiShape[] = za
    ? [
        { name: 'South Africa', pts: zaData.outer as Pt[], color: C.accent },
        { name: 'Lesotho', pts: zaData.lesotho as Pt[], color: C.gold },
      ]
    : dkData.islands.map((i) => ({ name: i.name, pts: i.pts as Pt[], color: C.accent }))
  return epicycleSpec(slug, shapes, snapN(q.n, za ? 150 : 80), {
    kicker: za ? 'Lab / 01' : 'Lab / 02',
    title: za ? 'South Africa, drawn by circles' : 'Denmark needs fifteen machines',
  })
}

// /lab/draw: the visitor's own outline travels in ?d=; without one, the heart preset.
function drawCard(q: CardQuery): CardSpec {
  const pts = decodeOutline(q.d) ?? PRESETS.heart.pts()
  return epicycleSpec('', [{ name: 'Your drawing', pts, color: C.accent }], snapN(q.n, 8, DRAW_STEPS), {
    kicker: 'Lab / 05',
    title: 'Drawn by circles',
  })
}

// ── Coastline paradox ────────────────────────────────────────────────
const fmtRuler = (r: number) => (r < 10 ? r.toFixed(1) : Math.round(r).toString())

function coastlineCard(q: CardQuery): CardSpec {
  const ruler = clampRuler(q.ruler)
  const countries = [
    { name: 'Denmark', color: C.accent, lines: dkData.coast as Pt[][] },
    { name: 'South Africa', color: C.gold, lines: zaData.coast as Pt[][] },
  ]
  const gap = 16
  const w = (BOX.w - gap) / 2
  const parts: string[] = []
  const stats: CardSpec['stats'] = [{ label: 'Ruler length', value: `${fmtRuler(ruler)} km` }]
  countries.forEach((c, i) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const l of c.lines) for (const [x, y] of l) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
    const { scale, transform } = fit(minX, minY, maxX, maxY, w, BOX.h, 24)
    const m = measure(c.lines, ruler)
    stats.push({ label: c.name, value: `${fmt(m.length)} km`, color: c.color })
    const coast = c.lines.map((l) => `M${poly(l)}`).join('')
    const walk = m.walks.filter((k) => k.length > 1).map((k) => `M${poly(k)}`).join('')
    const dots = m.steps < 260
      ? m.walks.flat().map((p) => `<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="${px(2.4, scale)}"/>`).join('')
      : ''
    parts.push(
      `<g transform="translate(${(i * (w + gap)).toFixed(1)},0)">`
      + `<g transform="${transform}">`
      + `<path d="${coast}" fill="none" stroke="${C.muted}" stroke-opacity="0.55" stroke-width="${px(1, scale)}"/>`
      + `<path d="${walk}" fill="none" stroke="${c.color}" stroke-width="${px(1.8, scale)}" stroke-linejoin="round"/>`
      + `<g fill="${c.color}">${dots}</g>`
      + `</g></g>`,
    )
  })
  return {
    kicker: 'Lab / 03',
    title: 'How long is Denmark?',
    stats,
    svg: parts.join(''),
  }
}

// ── Nobel lines ───────────────────────────────────────────────────
type P = [number, number]
const EVERYONE = 'everyone'
const SCIENCE = new Set(['Physics', 'Chemistry', 'Physiology or Medicine', 'Economic Sciences'])

// Same curve as the page: outbound arcs bow north, inbound bow south.
function arcPath(a: P, b: P, south = false, bend = 0.22) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const dist = Math.hypot(dx, dy) || 1
  let nx = -dy / dist, ny = dx / dist
  if ((ny > 0) !== south) { nx = -nx; ny = -ny }
  const k = dist * bend
  return `M${a[0]},${a[1]}Q${(mx + nx * k).toFixed(1)},${(my + ny * k).toFixed(1)} ${b[0]},${b[1]}`
}

export function parseCountry(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s || s.toLowerCase() === EVERYONE) return EVERYONE
  const world = worldData as WorldMap
  const hit = world.countries.find((c) => c.name.toLowerCase() === s.toLowerCase())
  return hit ? hit.name : toMapName(s) ?? EVERYONE
}

function nobelCard(q: CardQuery, nobel: NobelRow[]): CardSpec {
  const world = worldData as WorldMap
  const X = q.country === undefined ? 'South Africa' : parseCountry(q.country)
  const all = X === EVERYONE
  const centroids = new Map(world.countries.map((c) => [c.name, c.c]))
  const rows = nobel.map((r) => ({ ...r, b: toMapName(r.born), w: toMapName(r.won) }))
  const moves = rows.filter((r) => r.b && r.w && r.b !== r.w)

  const arcs: string[] = []
  const pts: P[] = []
  if (all) {
    const m = new Map<string, { d: string; n: number }>()
    for (const r of moves) {
      const a = centroids.get(r.b!), b = centroids.get(r.w!)
      if (!a || !b) continue
      const key = `${r.b}|${r.w}`
      const e = m.get(key) ?? { d: arcPath(a, b), n: 0 }
      e.n++
      m.set(key, e)
    }
    for (const e of [...m.values()].sort((a, b) => a.n - b.n)) {
      arcs.push(`<path d="${e.d}" stroke-width="${(0.8 + Math.log2(e.n) * 0.9).toFixed(2)}" stroke="${C.accent}" stroke-opacity="0.28"/>`)
    }
  } else {
    const c = centroids.get(X)
    if (c) pts.push(c)
    const groups = new Map<string, typeof moves>()
    for (const r of moves) {
      if (r.b !== X && r.w !== X) continue
      const key = `${r.b}|${r.w}`
      groups.set(key, [...(groups.get(key) ?? []), r])
    }
    // Same rule as the page: busy countries get one arc per route, weighted by count.
    const nMoves = [...groups.values()].reduce((k, l) => k + l.length, 0)
    const dense = groups.size > 6 || nMoves > 14
    for (const list of groups.values()) {
      if (dense) {
        const r = list[0]
        const a = centroids.get(r.b!), b = centroids.get(r.w!)
        if (!a || !b) continue
        pts.push(a, b)
        const out = r.b === X
        arcs.push(`<path d="${arcPath(a, b, !out, 0.18)}" stroke-width="${(1.2 + Math.log2(list.length) * 1.1).toFixed(2)}" stroke="${out ? C.accent : C.gold}" stroke-opacity="${out ? 0.75 : 0.8}"/>`)
        continue
      }
      list.forEach((r, i) => {
        const a = centroids.get(r.b!), b = centroids.get(r.w!)
        if (!a || !b) return
        pts.push(a, b)
        const out = r.b === X
        const bend = 0.14 + (list.length > 1 ? (i / (list.length - 1)) * 0.2 : 0.08)
        arcs.push(`<path d="${arcPath(a, b, !out, bend)}" stroke-width="1.6" stroke="${out ? C.accent : C.gold}" stroke-opacity="${out ? 0.75 : 0.8}"/>`)
      })
    }
  }

  // View box: the whole world, or a zoom on the country and its partners at the box's aspect.
  const FULL: [number, number, number, number] = [0, -40, world.width, world.height + 40]
  const ASPECT = BOX.w / BOX.h
  let vb = FULL
  if (!all && pts.length) {
    let x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]))
    let y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]))
    const padX = Math.max(80, (x1 - x0) * 0.22), padY = Math.max(60, (y1 - y0) * 0.35)
    x0 -= padX; x1 += padX; y0 -= padY; y1 += padY
    let w = Math.max(x1 - x0, 320)
    let h = Math.max(y1 - y0, w / ASPECT)
    w = Math.max(w, h * ASPECT)
    h = w / ASPECT
    if (w < FULL[2]) vb = [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h]
  }
  const scale = BOX.w / vb[2]
  const land = world.countries.map((c) =>
    `<path d="${c.d}" fill="${c.name === X ? C.accentDim : C.land}" stroke="${c.name === X ? C.accent : C.bg}" stroke-width="${c.name === X ? px(1, scale) : 0.5}"/>`,
  ).join('')

  // Home dots in the same golden-angle spiral as the page.
  const homeRows = all ? [] : rows.filter((r) => r.b === X && (r.w === X || !r.w))
  const c0 = centroids.get(X)
  // The spiral shrinks past ten dots so a big country's cluster stays the size of a small one's.
  const shrink = Math.min(1, Math.sqrt(10 / Math.max(1, homeRows.length)))
  const dots = c0
    ? homeRows.map((r, i) => {
        const ang = i * 2.39996, rad = vb[2] * 0.016 * shrink * Math.sqrt(i + 0.6)
        return `<circle cx="${(c0[0] + Math.cos(ang) * rad).toFixed(1)}" cy="${(c0[1] + Math.sin(ang) * rad).toFixed(1)}" r="${(vb[2] * 0.0055 * Math.max(0.45, shrink)).toFixed(2)}" fill="${SCIENCE.has(r.cat) ? C.text : C.gold}" stroke="${C.surface}" stroke-width="${px(0.6, scale)}"/>`
      }).join('')
    : ''

  // Centre the full world vertically when it is shorter than the box.
  const vh = vb[3]
  const boxH = BOX.w / (vb[2] / vh)
  const yOff = all ? (BOX.h - boxH) / 2 : 0
  const svg = `<svg x="0" y="${yOff.toFixed(1)}" width="${BOX.w}" height="${boxH.toFixed(1)}" viewBox="${vb.map((v) => v.toFixed(1)).join(' ')}">`
    + `<g>${land}</g><g fill="none" stroke-linecap="round">${arcs.join('')}</g><g>${dots}</g></svg>`

  let stats: CardSpec['stats']
  if (all) {
    const withBoth = rows.filter((r) => r.b && r.w)
    stats = [
      { label: 'Prizes to people', value: fmt(rows.length) },
      { label: 'Working outside their birth country', value: withBoth.length ? `${Math.round((100 * moves.length) / withBoth.length)}%` : '-' },
    ]
  } else {
    const born = rows.filter((r) => r.b === X)
    const away = born.filter((r) => r.w && r.w !== X)
    const gain = rows.filter((r) => r.w === X && r.b && r.b !== X)
    stats = [
      { label: `Born in ${X}`, value: String(born.length) },
      { label: 'Won at home', value: String(homeRows.length) },
      { label: 'Won from abroad', value: String(away.length) },
      { label: 'Born elsewhere, won from here', value: String(gain.length) },
    ]
  }
  return { kicker: 'Lab / 04', title: 'Born here, won there', stats, svg }
}

// ── Frame ────────────────────────────────────────────────────────────
function graphicDataUri(inner: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BOX.w}" height="${BOX.h}" viewBox="0 0 ${BOX.w} ${BOX.h}">`
    + `<rect width="${BOX.w}" height="${BOX.h}" fill="${C.surface}"/>${inner}</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } })

async function frame(spec: CardSpec): Promise<Buffer> {
  const { regular, bold } = await loadOgFonts()
  const stats = spec.stats.map((s) =>
    el('div', { display: 'flex', flexDirection: 'column', marginBottom: '18px' }, [
      el('div', { display: 'flex', fontSize: 17, color: C.muted, letterSpacing: '1px', textTransform: 'uppercase' }, s.label),
      el('div', { display: 'flex', fontSize: 30, fontWeight: 700, color: s.color ?? C.text, marginTop: '2px' }, s.value),
    ]),
  )
  const svg = await satori(
    el('div', { display: 'flex', position: 'relative', width: '1200px', height: '630px', background: C.bg, fontFamily: '"IBM Plex Mono", monospace' }, [
      el('div', { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'absolute', left: 56, top: 56, width: 430, height: 518 }, [
        el('div', { display: 'flex', flexDirection: 'column' }, [
          el('div', { display: 'flex', fontSize: 18, color: C.muted, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '22px' }, spec.kicker),
          el('div', { display: 'flex', fontSize: 44, fontWeight: 700, color: C.text, lineHeight: 1.15, marginBottom: '34px' }, spec.title),
          el('div', { display: 'flex', flexDirection: 'column' }, stats),
        ]),
        el('div', { display: 'flex', alignItems: 'center', fontSize: 20, color: C.accent, letterSpacing: '1px' }, 'madsnorgaard.net/lab'),
      ]),
      {
        type: 'img',
        props: {
          src: graphicDataUri(spec.svg),
          width: BOX.w,
          height: BOX.h,
          style: { position: 'absolute', left: BOX.x, top: BOX.y, width: `${BOX.w}px`, height: `${BOX.h}px`, border: `1px solid ${C.border}` },
        },
      },
    ]),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'IBM Plex Mono', data: regular, weight: 400, style: 'normal' },
        { name: 'IBM Plex Mono', data: bold, weight: 700, style: 'normal' },
      ],
    },
  )
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
}

export function isLabSlug(s: string): s is LabSlug {
  return (LAB_SLUGS as string[]).includes(s)
}

export async function renderLabCard(slug: LabSlug, q: CardQuery, nobel?: () => Promise<NobelRow[]>): Promise<Buffer> {
  let spec: CardSpec
  switch (slug) {
    case 'fourier-south-africa':
    case 'fourier-denmark':
      spec = fourierCard(slug, q)
      break
    case 'coastline-paradox':
      spec = coastlineCard(q)
      break
    case 'nobel-lines':
      spec = nobelCard(q, nobel ? await nobel() : [])
      break
    case 'draw':
      spec = drawCard(q)
      break
  }
  return frame(spec)
}
