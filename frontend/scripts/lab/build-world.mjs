// Builds public/lab-data/world.json for the Nobel page: every country as an SVG
// path in the Equal Earth projection, plus a label point for drawing arcs.
// Source: Natural Earth 1:110m (public domain), via world-atlas.
//
// Not part of the site build. To regenerate:
//   cd frontend && npm i --no-save world-atlas topojson-client
//   node scripts/lab/build-world.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { feature } from 'topojson-client'

const require = createRequire(import.meta.url)
const topo = JSON.parse(fs.readFileSync(require.resolve('world-atlas/countries-110m.json')))
const countries = feature(topo, topo.objects.countries).features

// Equal Earth (Šavrič, Patterson & Jenny, 2018)
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796
const M = Math.sqrt(3) / 2
function equalEarth(lon, lat) {
  const l = (lon * Math.PI) / 180
  const t = Math.asin(M * Math.sin((lat * Math.PI) / 180))
  const t2 = t * t, t6 = t2 * t2 * t2
  const x = (2 * Math.sqrt(3) * l * Math.cos(t)) / (3 * (9 * A4 * t6 * t2 + 7 * A3 * t6 + 3 * A2 * t2 + A1))
  const y = A4 * t6 * t2 * t + A3 * t6 * t + A2 * t2 * t + A1 * t
  return [x, y]
}

// Equal Earth spans x in ±2.7066, y in ±1.3173. Scale to a 1000-wide box.
const W = 1000
const XMAX = 2.70663
const YMAX = 1.31729
const S = W / (2 * XMAX)
const H = Math.round(2 * YMAX * S)
const px = ([lon, lat]) => {
  const [x, y] = equalEarth(lon, lat)
  return [+(W / 2 + x * S).toFixed(1), +(H / 2 - y * S).toFixed(1)]
}

const area = (r) => {
  let a = 0
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
  return a / 2
}
const centroid = (r) => {
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < r.length - 1; i++) {
    const f = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
    a += f
    cx += (r[i][0] + r[i + 1][0]) * f
    cy += (r[i][1] + r[i + 1][1]) * f
  }
  return [+(cx / (3 * a)).toFixed(1), +(cy / (3 * a)).toFixed(1)]
}

const out = []
for (const f of countries) {
  const name = f.properties.name
  if (name === 'Antarctica') continue
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  const projected = polys.map((p) => p.map((r) => r.map(px)))
  // Rings that cross the antimeridian (Fiji, Chukotka) would draw a line across
  // the whole map, so break the path wherever it jumps more than half the width.
  const ringPath = (r) => {
    let s = ''
    let jumped = false
    r.forEach((q, i) => {
      const jump = i > 0 && Math.abs(q[0] - r[i - 1][0]) > W / 2
      if (jump) jumped = true
      s += (i === 0 || jump ? 'M' : 'L') + q.join(',')
    })
    return jumped ? s : s + 'Z'
  }
  const d = projected.map((p) => p.map(ringPath).join('')).join('')
  const biggest = projected.map((p) => p[0]).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0]
  out.push({ name, d, c: centroid(biggest) })
}
// Places too small for the 1:110m map that still matter for Nobel birthplaces.
const small = [
  ['Faroe Islands', -6.9, 62.0], ['Saint Lucia', -60.98, 13.9], ['Singapore', 103.82, 1.35],
  ['Malta', 14.4, 35.9], ['Monaco', 7.42, 43.73], ['Liechtenstein', 9.55, 47.16],
  ['Guadeloupe', -61.55, 16.25], ['Hong Kong', 114.17, 22.32],
]
for (const [name, lon, lat] of small) out.push({ name, d: '', c: px([lon, lat]) })

fs.writeFileSync('public/lab-data/world.json', JSON.stringify({ source: 'Natural Earth 1:110m, via world-atlas', width: W, height: H, countries: out }))
console.log(`wrote public/lab-data/world.json (${out.length} countries, ${W}x${H})`)
