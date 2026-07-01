// GET /api/event/sets
// Returns the "nights" (child terms) under the Cold Turkey event parent term,
// for the filter chips. Ordered oldest-first so the chips read as a timeline.

const EVENT_SLUG = 'cold-turkey-cape-town'

// Sort key from a "D Month YYYY - …" night name so the chips read as a timeline
// (oldest first). Names that don't parse sort to the end.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
function nightTime(name: string): number {
  const m = name.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/)
  if (!m) return Number.MAX_SAFE_INTEGER
  const mon = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase())
  if (mon < 0) return Number.MAX_SAFE_INTEGER
  return Date.UTC(Number(m[3]), mon, Number(m[1]))
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl

  // Resolve the parent term ID.
  const parents = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/event-sets?slug=${encodeURIComponent(EVENT_SLUG)}&_fields=id,slug&per_page=1`
  )
  const parentId = Array.isArray(parents) && parents[0]?.id ? Number(parents[0].id) : 0
  if (!parentId) {
    return { event: EVENT_SLUG, sets: [] }
  }

  const children = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/event-sets?parent=${parentId}&per_page=100&orderby=name&order=asc&_fields=id,name,slug,count,parent`
  )

  const sets = (Array.isArray(children) ? children : [])
    .map((t: any) => ({
      id: t.id,
      name: decodeEntities(t.name ?? ''),
      slug: t.slug ?? '',
      count: Number(t.count ?? 0),
      parent: t.parent ?? parentId,
    }))
    // Only nights that actually have photos — an empty set is a leftover term
    // (e.g. from a folder-name mismatch on import) and must not show as a chip.
    .filter((s) => s.count > 0)
    // Timeline order: oldest night first (the first Cold Turkey photographed),
    // parsed from the "D Month YYYY - …" name rather than WP's alphabetical sort.
    .sort((a, b) => nightTime(a.name) - nightTime(b.name))

  return { event: EVENT_SLUG, parentId, sets }
})
