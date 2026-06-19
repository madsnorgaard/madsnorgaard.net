// GET /api/event/sets
// Returns the "nights" (child terms) under the Cold Turkey event parent term,
// for the filter chips. Ordered oldest-first so the chips read as a timeline.

const EVENT_SLUG = 'cold-turkey-cape-town'

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

  const sets = (Array.isArray(children) ? children : []).map((t: any) => ({
    id: t.id,
    name: decodeEntities(t.name ?? ''),
    slug: t.slug ?? '',
    count: t.count ?? 0,
    parent: t.parent ?? parentId,
  }))

  return { event: EVENT_SLUG, parentId, sets }
})
