// Beam drawing for the lab's instrument screens. The experiments draw with a
// "phosphor beam": a bright core with a soft bloom around it, the way a line
// looks on a vector monitor or an oscilloscope. Glow is done with layered
// strokes rather than shadowBlur, so it stays cheap on phones and renders the
// same way on canvas (here) and in the server-side SVG share cards.

import type { Pt } from './lab-fourier'

export interface BeamOpts {
  width?: number      // core stroke width in px
  bloom?: number      // bloom width multiplier on top of the core (0 = none)
  alpha?: number      // overall opacity 0..1
  close?: boolean
  hot?: boolean       // white-hot core, for the freshest part of a trace
}

// The glow layers, widest first: [width multiplier, alpha]
const LAYERS: [number, number][] = [[6, 0.08], [3, 0.18], [1, 1]]

// Hex colour (#RGB / #RRGGBB) or rgb()/rgba() to an rgba() with the given alpha.
export function withAlpha(color: string, a: number): string {
  const m = color.trim().match(/^#([0-9a-f]{3,8})$/i)
  if (m) {
    let h = m[1]
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${a})`
  }
  const rgb = color.match(/rgba?\(([^)]+)\)/)
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((s) => s.trim())
    return `rgba(${r},${g},${b},${a})`
  }
  return color
}

function trace(ctx: CanvasRenderingContext2D, pts: Pt[], close: boolean) {
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])
  }
  if (close) ctx.closePath()
}

// Stroke a polyline (screen coordinates) as a glowing beam.
export function beamPath(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, opts: BeamOpts = {}) {
  if (pts.length < 2) return
  const { width = 1.5, bloom = 1, alpha = 1, close = false, hot = false } = opts
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  trace(ctx, pts, close)
  for (const [mul, a] of LAYERS) {
    if (mul > 1 && !bloom) continue
    ctx.lineWidth = mul > 1 ? width * mul * bloom : width
    ctx.strokeStyle = withAlpha(mul === 1 && hot ? '#FFFFFF' : color, a * alpha)
    ctx.stroke()
  }
}

// A glowing dot: the pen tip, the hub, a divider foot.
export function beamDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, hot = false) {
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 4)
  halo.addColorStop(0, withAlpha(color, 0.55))
  halo.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(x, y, r * 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = hot ? '#FFFFFF' : color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

// SVG equivalent for the share cards: the same layered strokes as a <g>.
export function beamSvgPath(d: string, color: string, width: number, opts: { alpha?: number; bloom?: number } = {}): string {
  const { alpha = 1, bloom = 1 } = opts
  const strokes = LAYERS.map(([mul, a]) => {
    if (mul > 1 && !bloom) return ''
    const w = mul > 1 ? width * mul * bloom : width
    return `<path d="${d}" stroke="${color}" stroke-opacity="${(a * alpha).toFixed(3)}" stroke-width="${w.toFixed(3)}"/>`
  }).join('')
  return `<g fill="none" stroke-linejoin="round" stroke-linecap="round">${strokes}</g>`
}

// Shared screen colours (also used by the SVG cards, which cannot read CSS variables).
export const SCREEN = {
  bg: '#060606',
  grid: 'rgba(240, 237, 230, 0.045)',
  axis: 'rgba(240, 237, 230, 0.09)',
  ghost: 'rgba(240, 237, 230, 0.22)',
  arm: 'rgba(240, 237, 230, 0.5)',
  circle: 'rgba(240, 237, 230, 0.08)',
}
