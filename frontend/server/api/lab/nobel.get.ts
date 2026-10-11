// GET /api/lab/nobel
// Every Nobel prize awarded to a person, flattened to one row per prize, with
// the birth country and the country of the first affiliation at award time.
// Source: the official Nobel Prize API (v2.1, open, no key). Cached for a day.

import type { NobelRow } from '~/types/lab'

type Txt = { en?: string } | undefined
const en = (t: Txt) => (t && typeof t.en === 'string' && t.en.trim()) || null

interface ApiLaureate {
  id: string
  knownName?: Txt
  fullName?: Txt
  orgName?: Txt
  gender?: string
  birth?: { place?: { country?: Txt; countryNow?: Txt } }
  nobelPrizes?: {
    awardYear?: string
    category?: Txt
    affiliations?: { country?: Txt; countryNow?: Txt }[]
  }[]
}

export default defineCachedEventHandler(async (event) => {
  const base = (useRuntimeConfig(event).nobelApiBase as string).replace(/\/$/, '')
  const limit = 100
  const all: ApiLaureate[] = []

  for (let offset = 0; offset < 5000; offset += limit) {
    const page = await $fetch<{ laureates?: ApiLaureate[]; meta?: { count?: number } }>(
      `${base}/laureates`,
      { query: { offset, limit }, timeout: 15000, retry: 2 },
    )
    const batch = page.laureates ?? []
    all.push(...batch)
    const count = page.meta?.count ?? 0
    if (!batch.length || all.length >= count) break
  }

  const rows: NobelRow[] = []
  for (const l of all) {
    if (en(l.orgName)) continue // organisations (Red Cross, UNHCR...) have no birthplace
    for (const p of l.nobelPrizes ?? []) {
      const aff = p.affiliations?.[0]
      rows.push({
        id: l.id,
        name: en(l.knownName) ?? en(l.fullName) ?? 'Unknown',
        year: Number(p.awardYear),
        cat: en(p.category) ?? 'Unknown',
        born: en(l.birth?.place?.countryNow) ?? en(l.birth?.place?.country),
        won: en(aff?.countryNow) ?? en(aff?.country),
        gender: l.gender ?? null,
      })
    }
  }

  // A tiny result means the upstream answered strangely - fail rather than cache it.
  if (rows.length < 500) {
    throw createError({ statusCode: 502, statusMessage: 'Nobel API returned too little data' })
  }

  rows.sort((a, b) => a.year - b.year || a.name.localeCompare(b.name))
  return { fetched: new Date().toISOString(), rows }
}, {
  name: 'lab-nobel',
  maxAge: 60 * 60 * 24,
  swr: true,
})
