// Discrete Fourier transform helpers for the /lab epicycle drawings.
// A closed outline is treated as a complex signal z(n) = x(n) + i*y(n).
// Each coefficient is one rotating arm: radius |c|, speed k, phase arg(c).

export type Pt = [number, number]

// The arm counts the /lab epicycle slider steps through, shared with the share card.
export const EPI_STEPS = [1, 2, 3, 5, 8, 13, 20, 30, 50, 80, 120, 150, 200, 300, 500, 800]

// Nearest slider step to a requested N, so a shared ?n= always lands on a real position.
export function snapN(n: unknown, fallback: number, steps: number[] = EPI_STEPS): number {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return fallback
  return steps.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), steps[0])
}

export interface Term {
  k: number      // frequency (turns per cycle, can be negative)
  re: number
  im: number
  amp: number    // radius of the arm
}

export function dft(pts: Pt[]): Term[] {
  const M = pts.length
  const half = Math.floor(M / 2)
  const terms: Term[] = []
  for (let k = -half; k < M - half; k++) {
    let re = 0
    let im = 0
    for (let n = 0; n < M; n++) {
      const a = (-2 * Math.PI * k * n) / M
      const c = Math.cos(a)
      const s = Math.sin(a)
      re += pts[n][0] * c - pts[n][1] * s
      im += pts[n][0] * s + pts[n][1] * c
    }
    re /= M
    im /= M
    terms.push({ k, re, im, amp: Math.hypot(re, im) })
  }
  // Largest arms first, so truncating to N keeps the N most important ones.
  return terms.sort((a, b) => b.amp - a.amp)
}

// Point on the curve at time t in [0, 1) using the first n terms.
// If `joints` is passed, every arm's start point is written into it.
export function evaluate(terms: Term[], n: number, t: number, origin: Pt = [0, 0], joints?: Pt[]): Pt {
  let x = origin[0]
  let y = origin[1]
  const lim = Math.min(n, terms.length)
  for (let j = 0; j < lim; j++) {
    const { k, re, im } = terms[j]
    if (joints) joints.push([x, y])
    const a = 2 * Math.PI * k * t
    const c = Math.cos(a)
    const s = Math.sin(a)
    x += re * c - im * s
    y += re * s + im * c
  }
  if (joints) joints.push([x, y])
  return [x, y]
}

// RMS distance between the n-term reconstruction and the original samples,
// as a percentage of the outline's bounding-box diagonal.
export function rmsError(pts: Pt[], terms: Term[], n: number): number {
  const M = pts.length
  let sum = 0
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i < M; i++) {
    const [x, y] = evaluate(terms, n, i / M)
    sum += (x - pts[i][0]) ** 2 + (y - pts[i][1]) ** 2
    minX = Math.min(minX, pts[i][0]); maxX = Math.max(maxX, pts[i][0])
    minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1])
  }
  return (100 * Math.sqrt(sum / M)) / Math.hypot(maxX - minX, maxY - minY)
}
