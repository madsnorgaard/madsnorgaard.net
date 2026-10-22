// 1200x630 share cards for the /lab experiments, drawn as one of the lab's
// instrument screens: teletext page header, oscilloscope graticule, the
// experiment's graphic as a glowing beam, CRT scanlines and vignette over the
// lot. Each builder draws the graphic as plain SVG (explicit colours, no CSS
// variables, no text) from the same data the page uses; Satori sets the title
// and the readouts. The state a visitor can change on the page (arm count,
// ruler length, Nobel country) comes in as query parameters so a shared link
// previews exactly what they were looking at.

import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { loadOgFonts } from './og-fonts'
import { dft, evaluate, rmsError, snapN, type Pt, type Term } from '../../utils/lab-fourier'
import { DRAW_STEPS, PRESETS, decodeOutline } from '../../utils/lab-sketch'
import { measure, clampRuler } from '../../utils/lab-coastline'
import { toMapName } from '../../utils/lab-countries'
import { beamSvgPath, SCREEN } from '../../utils/lab-beam'
import type { NobelRow, WorldMap } from '../../types/lab'
import dkData from '../../public/lab-data/dk.json'
import zaData from '../../public/lab-data/za.json'
import worldData from '../../public/lab-data/world.json'

const C = {
  bg: SCREEN.bg,
  bar: '#111111',
  border: '#2A2A2A',
  land: '#171717',
  text: '#F0EDE6',
  muted: '#8C8680',
  accent: '#D0243E',
  accentDim: 'rgba(208, 36, 62, 0.18)',
  gold: '#E8C26A',
}

const W = 1200, H = 630
const BAR = 44                                  // teletext header height
const BOX = { x: 500, y: 76, w: 676, h: 516 }   // the graphic, right of the title column

export type LabSlug = 'fourier-south-africa' | 'fourier-denmark' | 'coastline-paradox' | 'nobel-lines' | 'draw'
export const LAB_SLUGS: LabSlug[] = ['fourier-south-africa', 'fourier-denmark', 'coastline-paradox', 'nobel-lines', 'draw']

export interface CardSpec {
  page: string      // teletext page number
  label: string     // header label
  title: string
  stats: { label: string; value: string; color?: string }[]
  svg: string       // inner SVG markup, drawn into a BOX.w x BOX.h viewBox
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

// A glowing dot in user units: halo gradient plus a core.
let haloId = 0
function dot(x: number, y: number, r: number, color: string, hot: boolean): string {
  const id = `h${haloId++}`
  return `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="0.6"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`
    + `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(r * 4).toFixed(2)}" fill="url(#${id})"/>`
    + `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="${hot ? '#FFFFFF' : color}"/>`
}

// ── Fourier epicycles ────────────────────────────────────────────────
const spectrumCache = new Map<string, Term[]>()
function spectrum(key: string, pts: Pt[]): Term[] {
  let t = spectrumCache.get(key)
  if (!t) { t = dft(pts); spectrumCache.set(key, t) }
  return t
}

interface EpiShape { name: string; pts: Pt[]; color: string }

// The epicycle drawing shared by the three machine cards: dotted ghost of the
// target, the beam traced up to t with a white-hot tail, arms and circles at t.
function epicycleSpec(cacheKey: string, shapes: EpiShape[], n: number, head: Pick<CardSpec, 'page' | 'label' | 'title'>): CardSpec {
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
    ghosts.push(`<path d="M${poly(s.pts)}Z" fill="none" stroke="${SCREEN.ghost}" stroke-width="${px(1, scale)}" stroke-dasharray="${px(2, scale)} ${px(4, scale)}"/>`)
    const samples = Math.max(400, s.pts.length * 2)
    const upto = Math.floor(t * samples)
    const trace: Pt[] = []
    for (let j = 0; j <= upto; j++) trace.push(evaluate(terms, n, j / samples))
    parts.push(beamSvgPath(`M${poly(trace)}`, s.color, px(1.8, scale), { alpha: 0.9 }))
    const tail = trace.slice(Math.max(0, upto - Math.ceil(samples * 0.04)))
    parts.push(beamSvgPath(`M${poly(tail)}`, s.color, px(2, scale), { bloom: 1.6 }))
    parts.push(`<path d="M${poly(tail)}" fill="none" stroke="#FFFFFF" stroke-width="${px(1.6, scale)}" stroke-linecap="round" stroke-linejoin="round"/>`)
    const joints: Pt[] = []
    evaluate(terms, n, t, [0, 0], joints)
    const circles: string[] = []
    for (let j = 1; j < joints.length - 1; j++) {
      const r = terms[j].amp
      if (r * scale < 0.8) continue
      circles.push(`<circle cx="${joints[j][0].toFixed(2)}" cy="${joints[j][1].toFixed(2)}" r="${r.toFixed(2)}"/>`)
    }
    parts.push(`<g fill="none" stroke="${SCREEN.circle}" stroke-width="${px(1, scale)}">${circles.join('')}</g>`)
    parts.push(`<path d="M${poly(joints)}" fill="none" stroke="${SCREEN.arm}" stroke-width="${px(1, scale)}"/>`)
    const tip = joints[joints.length - 1]
    parts.push(dot(tip[0], tip[1], px(2.4, scale), s.color, true))
  })
  parts.push(dot(0, 0, px(2.2, scale), C.text, false))

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
    page: za ? '101' : '102',
    label: za ? 'Lab · Fourier / ZA' : 'Lab · Fourier / DK',
    title: za ? 'South Africa, drawn by circles' : 'Denmark needs fifteen machines',
  })
}

// /lab/draw: the visitor's own outline travels in ?d=; without one, the heart preset.
function drawCard(q: CardQuery): CardSpec {
  const pts = decodeOutline(q.d) ?? PRESETS.heart.pts()
  return epicycleSpec('', [{ name: 'Your drawing', pts, color: C.accent }], snapN(q.n, 8, DRAW_STEPS), {
    page: '105',
    label: 'Lab · Light pen',
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
    const { scale, transform } = fit(minX, minY, maxX, maxY, w, BOX.h, 12)
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
      + `<path d="${coast}" fill="none" stroke="${C.text}" stroke-opacity="0.3" stroke-width="${px(1, scale)}" stroke-dasharray="${px(2, scale)} ${px(3, scale)}"/>`
      + beamSvgPath(walk, c.color, px(1.8, scale))
      + `<g fill="${c.color}">${dots}</g>`
      + `</g></g>`,
    )
  })
  return {
    page: '103',
    label: 'Lab · Coastline',
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
      arcs.push(`<path d="${e.d}" stroke-width="${(0.8 + Math.log2(e.n) * 0.9).toFixed(2)}" stroke="${C.accent}" stroke-opacity="0.3"/>`)
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
        // the same beam as the single arcs below, thicker the more people took the route
        arcs.push(beamSvgPath(arcPath(a, b, !out, 0.18), out ? C.accent : C.gold, 1.2 + Math.log2(list.length) * 1.1, { alpha: out ? 0.75 : 0.8 }))
        continue
      }
      list.forEach((r, i) => {
        const a = centroids.get(r.b!), b = centroids.get(r.w!)
        if (!a || !b) return
        pts.push(a, b)
        const out = r.b === X
        const bend = 0.14 + (list.length > 1 ? (i / (list.length - 1)) * 0.2 : 0.08)
        arcs.push(beamSvgPath(arcPath(a, b, !out, bend), out ? C.accent : C.gold, 1.6, { alpha: 0.9 }))
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
    `<path d="${c.d}" fill="${c.name === X ? C.accentDim : C.land}" stroke="${c.name === X ? C.accent : '#000'}" stroke-width="${c.name === X ? px(1, scale) : 0.5}"/>`,
  ).join('')

  // Home dots in the same golden-angle spiral as the page.
  const homeRows = all ? [] : rows.filter((r) => r.b === X && (r.w === X || !r.w))
  const c0 = centroids.get(X)
  // The spiral shrinks past ten dots so a big country's cluster stays the size of a small one's.
  const shrink = Math.min(1, Math.sqrt(10 / Math.max(1, homeRows.length)))
  const dots = c0
    ? homeRows.map((r, i) => {
        const ang = i * 2.39996, rad = vb[2] * 0.016 * shrink * Math.sqrt(i + 0.6)
        return `<circle cx="${(c0[0] + Math.cos(ang) * rad).toFixed(1)}" cy="${(c0[1] + Math.sin(ang) * rad).toFixed(1)}" r="${(vb[2] * 0.0055 * Math.max(0.45, shrink)).toFixed(2)}" fill="${SCIENCE.has(r.cat) ? C.text : C.gold}" stroke="#000" stroke-width="${px(0.6, scale)}"/>`
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
  return { page: '104', label: `Lab · ${all ? 'Everyone' : X}`, title: 'Born here, won there', stats, svg }
}

// ── Frame ────────────────────────────────────────────────────────────
const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

// The graphic, transparent, floating over the screen's graticule.
function graphicUri(inner: string): string {
  return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${BOX.w}" height="${BOX.h}" viewBox="0 0 ${BOX.w} ${BOX.h}">${inner}</svg>`)
}

// Under everything: the spectrum stripe and the oscilloscope graticule.
function backdropUri(): string {
  const stops = [['0', '#ff2020'], ['0.18', '#ff6600'], ['0.34', '#ffcc00'], ['0.5', '#00cc44'], ['0.66', '#0099ff'], ['0.82', '#7733cc'], ['1', '#ff0066']]
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')
  const cell = 60
  return dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<defs><linearGradient id="sp" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>`
    + `<pattern id="g" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse" x="0" y="${BAR}"><path d="M${cell},0H0V${cell}" fill="none" stroke="${C.text}" stroke-opacity="0.045" stroke-width="1"/></pattern></defs>`
    + `<rect width="${W}" height="${H}" fill="${C.bg}"/>`
    + `<rect y="${BAR}" width="${W}" height="${H - BAR}" fill="url(#g)"/>`
    + `<path d="M${W / 2},${BAR}V${H}M0,${(BAR + H) / 2}H${W}" stroke="${C.text}" stroke-opacity="0.07" stroke-width="1"/>`
    + `<rect width="4" height="${H}" fill="url(#sp)" opacity="0.6"/>`
    + `</svg>`,
  )
}

// Over everything: scanlines, vignette and the bezel line.
function overlayUri(): string {
  return dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<defs><pattern id="s" width="4" height="4" patternUnits="userSpaceOnUse"><rect y="2" width="4" height="2" fill="#000" fill-opacity="0.13"/></pattern>`
    + `<radialGradient id="v" cx="0.5" cy="0.5" r="0.72"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#s)"/>`
    + `<rect width="${W}" height="${H}" fill="url(#v)"/>`
    + `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${C.border}"/>`
    + `</svg>`,
  )
}

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } })
const img = (src: string, x: number, y: number, w: number, h: number) =>
  ({ type: 'img', props: { src, width: w, height: h, style: { position: 'absolute', left: x, top: y, width: `${w}px`, height: `${h}px` } } })

async function frame(spec: CardSpec): Promise<Buffer> {
  const { regular, bold } = await loadOgFonts()
  const d = new Date()
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const stamp = `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  const stats = spec.stats.map((s) =>
    el('div', { display: 'flex', flexDirection: 'column', marginBottom: '16px' }, [
      el('div', { display: 'flex', fontSize: 15, color: C.muted, letterSpacing: '2px', textTransform: 'uppercase' }, s.label),
      el('div', { display: 'flex', fontSize: 30, color: s.color ?? C.gold, marginTop: '2px', textShadow: `0 0 14px ${s.color ?? C.gold}` }, s.value),
    ]),
  )
  const svg = await satori(
    el('div', { display: 'flex', position: 'relative', width: `${W}px`, height: `${H}px`, background: C.bg, fontFamily: '"IBM Plex Mono", monospace' }, [
      img(backdropUri(), 0, 0, W, H),
      // Teletext header
      el('div', { display: 'flex', position: 'absolute', left: 0, top: 0, width: `${W}px`, height: `${BAR}px`, alignItems: 'center', background: C.bar, borderBottom: `1px solid ${C.border}`, paddingLeft: '22px', paddingRight: '22px', fontSize: 15, letterSpacing: '2px', textTransform: 'uppercase', color: C.muted }, [
        el('div', { display: 'flex', background: C.accent, color: '#fff', padding: '2px 9px', fontWeight: 700, marginRight: '16px' }, `P${spec.page}`),
        el('div', { display: 'flex', color: C.text }, spec.label),
        el('div', { display: 'flex', marginLeft: 'auto', color: C.muted }, `madsnorgaard.net  ·  ${stamp}`),
      ]),
      // Title column
      el('div', { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'absolute', left: 48, top: 84, width: 420, height: 500 }, [
        el('div', { display: 'flex', flexDirection: 'column' }, [
          el('div', { display: 'flex', fontSize: 42, fontWeight: 700, color: C.text, lineHeight: 1.15, marginBottom: '30px', textShadow: '0 0 18px rgba(240,237,230,0.35)' }, spec.title),
          el('div', { display: 'flex', flexDirection: 'column' }, stats),
        ]),
        el('div', { display: 'flex', alignItems: 'center', fontSize: 19, color: C.accent, letterSpacing: '1px', textShadow: `0 0 12px ${C.accent}` }, [
          el('span', { display: 'flex' }, 'madsnorgaard.net/lab'),
          el('span', { display: 'flex', width: '11px', height: '22px', background: C.accent, marginLeft: '8px' }),
        ]),
      ]),
      img(graphicUri(spec.svg), BOX.x, BOX.y, BOX.w, BOX.h),
      img(overlayUri(), 0, 0, W, H),
    ]),
    {
      width: W,
      height: H,
      fonts: [
        { name: 'IBM Plex Mono', data: regular, weight: 400, style: 'normal' },
        { name: 'IBM Plex Mono', data: bold, weight: 700, style: 'normal' },
      ],
    },
  )
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng()
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
