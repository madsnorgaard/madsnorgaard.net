// Richardson's divider method for the /lab coastline paradox page.
// Walk a ruler of fixed length along a coastline, pivoting each time it
// touches the line again, and count the steps.

import type { Pt } from './lab-fourier'

export interface Walk {
  length: number     // steps * ruler + the leftover bit at the end
  steps: number
  points: Pt[]       // where the ruler touched down
}

export function dividerWalk(line: Pt[], ruler: number): Walk {
  const points: Pt[] = [line[0]]
  let p = line[0]
  let steps = 0
  let i = 0 // current segment

  while (i < line.length - 1) {
    const a = line[i]
    const b = line[i + 1]
    if (Math.hypot(b[0] - p[0], b[1] - p[1]) < ruler) {
      i++
      continue
    }
    // Solve |a + t(b - a) - p| = ruler for the far root.
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const fx = a[0] - p[0], fy = a[1] - p[1]
    const A = dx * dx + dy * dy
    const B = 2 * (dx * fx + dy * fy)
    const C = fx * fx + fy * fy - ruler * ruler
    const t = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A)
    p = [a[0] + t * dx, a[1] + t * dy]
    points.push(p)
    steps++
  }
  const end = line[line.length - 1]
  const rest = Math.hypot(end[0] - p[0], end[1] - p[1])
  if (rest > 0) points.push(end)
  return { length: steps * ruler + rest, steps, points }
}

export function measure(lines: Pt[][], ruler: number) {
  let length = 0
  let steps = 0
  const walks = lines.map((l) => {
    const w = dividerWalk(l, ruler)
    length += w.length
    steps += w.steps
    return w.points
  })
  return { length, steps, walks }
}

// Least-squares slope of log L against log r. Fractal dimension D = 1 - slope.
export function fractalDimension(samples: { r: number; L: number }[]): number {
  const xs = samples.map((s) => Math.log(s.r))
  const ys = samples.map((s) => Math.log(s.L))
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  return 1 - num / den
}
