// Shapes shared between the /lab pages and their server routes.

export interface NobelRow {
  id: string
  name: string
  year: number
  cat: string            // Physics, Chemistry, Physiology or Medicine, Literature, Peace, Economic Sciences
  born: string | null    // birth country, today's name
  won: string | null     // affiliation country at award time, today's name (null for most Peace/Literature)
  gender: string | null
}

// public/lab-data/world.json, built by scripts/lab/build-world.mjs.
export interface WorldMap {
  source: string
  width: number
  height: number
  countries: { name: string; d: string; c: [number, number] }[]
}
