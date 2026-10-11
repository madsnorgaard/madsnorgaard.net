// Pure-maths checks for the /lab helpers. No browser: Playwright runs these in Node.
import { test, expect } from '@playwright/test'
import { dft, evaluate, rmsError, type Pt } from '../../utils/lab-fourier'
import { dividerWalk, measure, fractalDimension } from '../../utils/lab-coastline'
import { toMapName } from '../../utils/lab-countries'

const circle = (n: number, r = 10, cx = 0, cy = 0): Pt[] =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)])

test.describe('lab-fourier', () => {
  test('a circle is one arm of radius r plus a centre term', () => {
    const terms = dft(circle(64, 10, 3, -2))
    expect(terms[0].amp).toBeCloseTo(10, 6)
    expect(Math.abs(terms[0].k)).toBe(1)
    expect(terms[1].amp).toBeCloseTo(Math.hypot(3, -2), 6)
    expect(terms[1].k).toBe(0)
    expect(terms[2].amp).toBeLessThan(1e-9)
  })

  test('terms are sorted largest first', () => {
    const terms = dft(circle(32).map(([x, y], i) => [x + (i % 2) * 2, y]))
    for (let i = 1; i < terms.length; i++) expect(terms[i].amp).toBeLessThanOrEqual(terms[i - 1].amp)
  })

  test('full series reconstructs every sample point', () => {
    const pts = circle(40).map(([x, y], i): Pt => [x + Math.sin(i) * 3, y + Math.cos(2 * i)])
    const terms = dft(pts)
    pts.forEach((p, i) => {
      const [x, y] = evaluate(terms, terms.length, i / pts.length)
      expect(x).toBeCloseTo(p[0], 6)
      expect(y).toBeCloseTo(p[1], 6)
    })
    expect(rmsError(pts, terms, terms.length)).toBeLessThan(1e-6)
  })

  test('error falls as N grows', () => {
    const pts = circle(100).map(([x, y], i): Pt => [x + Math.sin(5 * i) * 2, y + Math.cos(3 * i) * 2])
    const terms = dft(pts)
    const errs = [1, 3, 10, 30, 100].map((n) => rmsError(pts, terms, n))
    for (let i = 1; i < errs.length; i++) expect(errs[i]).toBeLessThanOrEqual(errs[i - 1])
  })

  test('evaluate records every joint', () => {
    const terms = dft(circle(16))
    const joints: Pt[] = []
    evaluate(terms, 5, 0.3, [1, 1], joints)
    expect(joints).toHaveLength(6)
    expect(joints[0]).toEqual([1, 1])
  })
})

test.describe('lab-coastline', () => {
  test('a straight line measures its own length for any ruler', () => {
    const line: Pt[] = [[0, 0], [10, 0], [20, 0], [100, 0]]
    for (const r of [1, 7, 30, 250]) expect(dividerWalk(line, r).length).toBeCloseTo(100, 6)
  })

  test('step count is floor(length / ruler) on a straight line', () => {
    const w = dividerWalk([[0, 0], [100, 0]], 30)
    expect(w.steps).toBe(3)
    expect(w.points).toHaveLength(5) // start, 3 touches, end
  })

  test('a long ruler cuts corners, a short one does not', () => {
    const zigzag: Pt[] = []
    for (let i = 0; i <= 40; i++) zigzag.push([i, i % 2 ? 1 : 0])
    const fine = measure([zigzag], 0.1).length
    const coarse = measure([zigzag], 20).length
    expect(fine).toBeGreaterThan(coarse)
    expect(coarse).toBeLessThanOrEqual(40.1)
  })

  test('fractal dimension of a straight line is 1', () => {
    const line: Pt[] = [[0, 0], [1000, 0]]
    const samples = [1, 2, 5, 10, 20].map((r) => ({ r, L: measure([line], r).length }))
    expect(fractalDimension(samples)).toBeCloseTo(1, 6)
  })

  test('fractal dimension exceeds 1 when length grows as the ruler shrinks', () => {
    const samples = [1, 2, 4, 8, 16].map((r) => ({ r, L: 1000 * r ** -0.25 }))
    expect(fractalDimension(samples)).toBeCloseTo(1.25, 6)
  })
})

test.describe('lab-countries', () => {
  test('maps API names onto Natural Earth names', () => {
    expect(toMapName('USA')).toBe('United States of America')
    expect(toMapName('Scotland')).toBe('United Kingdom')
    expect(toMapName('the Netherlands')).toBe('Netherlands')
    expect(toMapName('Guadeloupe, France')).toBe('Guadeloupe')
    expect(toMapName('Germany (now France)')).toBe('Germany')
    expect(toMapName(null)).toBeNull()
  })
})
