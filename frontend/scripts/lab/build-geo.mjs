// Builds the outline data for the /lab pages from Natural Earth 1:10m
// (public domain), via the world-atlas TopoJSON package.
//
// Not part of the site build. To regenerate:
//   cd frontend && npm i --no-save world-atlas topojson-client
//   node scripts/lab/build-geo.mjs
//
// Output (coordinates in km, x = east, y = north, local equirectangular):
//   public/lab/za.json  South Africa outer border, Lesotho, coastline lines
//   public/lab/dk.json  Denmark islands, coastline lines
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { feature, mesh } from 'topojson-client'

const require = createRequire(import.meta.url)
const topo = JSON.parse(fs.readFileSync(require.resolve('world-atlas/countries-10m.json')))
const countries = feature(topo, topo.objects.countries).features
const R = 6371

const projector = (lat0, lon0) => {
  const c = Math.cos((lat0 * Math.PI) / 180)
  return ([lon, lat]) => [
    (R * (lon - lon0) * Math.PI) / 180 * c,
    (R * (lat - lat0) * Math.PI) / 180,
  ]
}
const round = (pts) => pts.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)])
const signedArea = (r) => {
  let a = 0
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
  return a / 2
}
// Even arc-length resampling of a closed ring, counter-clockwise, n points.
const resample = (ring, n) => {
  let r = ring.slice()
  if (signedArea(r) < 0) r.reverse()
  const seg = []
  let total = 0
  for (let i = 1; i < r.length; i++) {
    const d = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1])
    seg.push(d)
    total += d
  }
  const out = []
  let i = 0
  let acc = 0
  for (let k = 0; k < n; k++) {
    const target = (k * total) / n
    while (i < seg.length - 1 && acc + seg[i] < target) acc += seg[i++]
    const t = seg[i] ? (target - acc) / seg[i] : 0
    out.push([r[i][0] + t * (r[i + 1][0] - r[i][0]), r[i][1] + t * (r[i + 1][1] - r[i][1])])
  }
  return round(out)
}
const coastOf = (name, project, maxDist) =>
  mesh(topo, topo.objects.countries, (a, b) => a === b && a.properties.name === name)
    .coordinates.map((l) => l.map(project))
    .filter((l) => l.every(([x, y]) => Math.hypot(x, y) < maxDist))
    .map(round)

// South Africa
{
  const p = projector(-29, 25)
  const za = countries.find((f) => f.properties.name === 'South Africa')
  const main = za.geometry.coordinates
    .map((poly) => poly.map((r) => r.map(p)))
    .sort((a, b) => Math.abs(signedArea(b[0])) - Math.abs(signedArea(a[0])))[0]
  fs.writeFileSync('public/lab/za.json', JSON.stringify({
    source: 'Natural Earth 1:10m, via world-atlas',
    outer: resample(main[0], 1400),
    lesotho: resample(main[1], 360),
    coast: coastOf('South Africa', p, 1500),
  }))
}

// Denmark
{
  const p = projector(56, 10.5)
  const names = [
    [9.37, 56.22, 'Jutland'], [11.77, 55.44, 'Zealand'], [10.30, 55.35, 'Funen'],
    [11.48, 54.80, 'Lolland'], [14.96, 55.14, 'Bornholm'], [8.75, 56.83, 'Mors'],
    [10.74, 54.91, 'Langeland'], [9.84, 54.96, 'Als'], [12.27, 54.98, 'Møn'],
    [10.58, 55.89, 'Samsø'], [11.04, 57.28, 'Læsø'], [10.39, 54.89, 'Ærø'],
    [12.59, 55.63, 'Amager'], [8.43, 55.40, 'Fanø'], [11.58, 56.70, 'Anholt'],
  ]
  const dk = countries.find((f) => f.properties.name === 'Denmark')
  const islands = dk.geometry.coordinates.map((poly) => {
    const r = poly[0]
    const lo = r.reduce((s, q) => s + q[0], 0) / r.length
    const la = r.reduce((s, q) => s + q[1], 0) / r.length
    const name = names.sort((a, b) => Math.hypot(a[0] - lo, a[1] - la) - Math.hypot(b[0] - lo, b[1] - la))[0][2]
    const ring = r.map(p)
    const per = ring.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - ring[i][0], q[1] - ring[i][1]), 0)
    return { name, area: Math.round(Math.abs(signedArea(ring))), pts: resample(ring, Math.max(64, Math.min(1200, Math.round(per * 0.55)))) }
  }).sort((a, b) => b.area - a.area)
  fs.writeFileSync('public/lab/dk.json', JSON.stringify({
    source: 'Natural Earth 1:10m, via world-atlas',
    islands,
    coast: coastOf('Denmark', p, 600),
  }))
}
console.log('wrote public/lab/za.json, public/lab/dk.json')
