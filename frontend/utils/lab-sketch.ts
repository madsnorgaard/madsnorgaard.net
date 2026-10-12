// Helpers for /lab/draw: turn a freehand stroke into a closed outline the
// epicycle machine can draw, and pack that outline into a short URL-safe
// string so a drawing can be shared as a link and rendered as a share card.

import type { Pt } from './lab-fourier'

export const SKETCH_POINTS = 128          // samples per outline after resampling
export const SKETCH_EXTENT = 500          // outline is scaled to fit ±SKETCH_EXTENT
export const DRAW_STEPS = [1, 2, 3, 5, 8, 13, 20, 30, 50, 80, SKETCH_POINTS]

// Resample a polyline to `count` evenly spaced points along its length,
// treating it as closed (the last point joins back to the first).
export function resampleClosed(raw: Pt[], count = SKETCH_POINTS): Pt[] {
  const pts = raw.filter((p, i) => i === 0 || Math.hypot(p[0] - raw[i - 1][0], p[1] - raw[i - 1][1]) > 0.01)
  if (pts.length < 3) return []
  const loop = [...pts, pts[0]]
  const seg: number[] = []
  let total = 0
  for (let i = 1; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1])
    seg.push(d)
    total += d
  }
  if (total === 0) return []
  const out: Pt[] = []
  const step = total / count
  let i = 0
  let along = 0  // distance covered at the start of segment i
  for (let k = 0; k < count; k++) {
    const target = k * step
    while (i < seg.length - 1 && along + seg[i] < target) { along += seg[i]; i++ }
    const t = seg[i] ? (target - along) / seg[i] : 0
    const a = loop[i], b = loop[i + 1]
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
  }
  return out
}

// Centre on the centroid and scale so the larger side spans 2 * SKETCH_EXTENT.
export function normalise(pts: Pt[]): Pt[] {
  if (!pts.length) return []
  let cx = 0, cy = 0
  for (const [x, y] of pts) { cx += x; cy += y }
  cx /= pts.length; cy /= pts.length
  let r = 0
  for (const [x, y] of pts) r = Math.max(r, Math.abs(x - cx), Math.abs(y - cy))
  const s = r ? SKETCH_EXTENT / r : 1
  return pts.map(([x, y]) => [(x - cx) * s, (y - cy) * s])
}

// A canvas stroke (y down, pixels) to an outline in the machine's coordinates (y up).
export function strokeToOutline(stroke: Pt[]): Pt[] {
  return normalise(resampleClosed(stroke)).map(([x, y]) => [x, -y])
}

// ── URL encoding ─────────────────────────────────────────────────────
// 12 bits per coordinate on a grid over ±SKETCH_EXTENT (×1.2 headroom), three
// bytes per point, base64url. 128 points come to 512 characters.
const GRID = 4095
const RANGE = SKETCH_EXTENT * 1.2
const q = (v: number) => Math.max(0, Math.min(GRID, Math.round(((v + RANGE) / (2 * RANGE)) * GRID)))
const dq = (u: number) => (u / GRID) * 2 * RANGE - RANGE

export function encodeOutline(pts: Pt[]): string {
  const bytes = new Uint8Array(pts.length * 3)
  pts.forEach(([x, y], i) => {
    const u = q(x), v = q(y)
    bytes[i * 3] = u >> 4
    bytes[i * 3 + 1] = ((u & 15) << 4) | (v >> 8)
    bytes[i * 3 + 2] = v & 255
  })
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeOutline(s: unknown): Pt[] | null {
  if (typeof s !== 'string' || !/^[A-Za-z0-9_-]{12,2048}$/.test(s)) return null
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  let bin: string
  try {
    bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary')
  } catch {
    return null
  }
  if (bin.length % 3 !== 0) return null
  const n = bin.length / 3
  if (n < 3 || n > 512) return null
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = bin.charCodeAt(i * 3), b = bin.charCodeAt(i * 3 + 1), c = bin.charCodeAt(i * 3 + 2)
    out.push([dq((a << 4) | (b >> 4)), dq(((b & 15) << 8) | c)])
  }
  return out
}

// ── Presets to start from ────────────────────────────────────────────
export const PRESETS: Record<string, { label: string; glyph: string; pts: () => Pt[] }> = {
  heart: {
    label: 'Heart',
    glyph: '♥',
    pts: () => {
      const raw: Pt[] = []
      for (let i = 0; i < 200; i++) {
        const t = (i / 200) * 2 * Math.PI
        raw.push([16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)])
      }
      return normalise(resampleClosed(raw))
    },
  },
  star: {
    label: 'Star',
    glyph: '★',
    pts: () => {
      const raw: Pt[] = []
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const r = i % 2 ? 0.42 : 1
        raw.push([Math.cos(a) * r, Math.sin(a) * r])
      }
      return normalise(resampleClosed(raw))
    },
  },
}
