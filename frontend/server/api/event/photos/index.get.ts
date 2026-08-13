// GET /api/event/photos
// Paginated list of event_photo posts for the Cold Turkey wall.
//
// Query params:
//   page  - Page number (default 1)
//   set   - event_set child-term slug (a "night"). Omit for all nights blended.
//
// With no `set`, no taxonomy filter is applied, so every event_photo (all
// nights) is returned. With a `set`, only that night's photos are returned,
// filtered via the taxonomy REST base `event-sets` (not the taxonomy name).

const PER_PAGE = 50

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl
  const query = getQuery(event)

  const page = clampInt(query.page, 1, 1000, 1)

  // Favourites path: an explicit id list (the photos this device hearted).
  // Resolve them directly by ID, preserving the given order.
  const ids =
    typeof query.ids === 'string'
      ? query.ids
          .split(',')
          .map((s) => parseInt(s, 10))
          .filter((n) => Number.isFinite(n) && n > 0)
          .slice(0, 100)
      : []

  const params = new URLSearchParams({
    status: 'publish',
    _embed: 'wp:featuredmedia,wp:term',
  })

  if (ids.length) {
    params.set('include', ids.join(','))
    params.set('per_page', String(ids.length))
    params.set('orderby', 'include')
  } else {
    params.set('per_page', String(PER_PAGE))
    params.set('page', String(page))
    // Ascending so each night plays forward as it happened (the importer
    // inserts posts in filename order = Lightroom's capture sequence).
    params.set('orderby', 'date')
    params.set('order', 'asc')
    // Filter to a single night when a valid set slug is given. The WP REST
    // taxonomy filter param is the taxonomy's REST BASE ('event-sets'), NOT the
    // taxonomy name ('event_set') — the latter is silently ignored, which is why
    // picking a set used to still show every night. No set => no taxonomy filter
    // => all nights (every event_photo). (Single-event site; if more events are
    // added, filter the no-set case by the parent term's child IDs.)
    if (query.set && typeof query.set === 'string' && isValidSlug(query.set)) {
      const termId = await resolveTermId(base, query.set)
      if (termId) params.set('event-sets', String(termId))
    }
  }

  const url = `${base}/wp-json/wp/v2/event-photos?${params.toString()}`
  const { data: posts, total, totalPages } = await wpFetchWithHeaders<any[]>(url)

  const photos = (Array.isArray(posts) ? posts : []).map(toEventPhoto)

  return { photos, total, totalPages, page, perPage: PER_PAGE }
})

// Map slug -> term ID via the event-sets endpoint (cheap; cached by the route's
// SWR). Returns 0 when the term cannot be resolved (then we return all photos).
async function resolveTermId(base: string, slug: string): Promise<number> {
  const terms = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/event-sets?slug=${encodeURIComponent(slug)}&_fields=id,slug&per_page=1`
  )
  const id = Array.isArray(terms) && terms[0]?.id ? Number(terms[0].id) : 0
  return Number.isFinite(id) ? id : 0
}

function toEventPhoto(post: any) {
  const media = post._embedded?.['wp:featuredmedia']?.[0]
  const setTerms = post._embedded?.['wp:term']?.flat?.() ?? []
  // The most specific (child) term is the night; fall back to first.
  const night = setTerms.find((t: any) => t?.taxonomy === 'event_set' && t?.parent)
    ?? setTerms.find((t: any) => t?.taxonomy === 'event_set')

  return {
    id: post.id,
    images: extractWpImages(media),
    likeCount: Number(post.meta?.like_count ?? 0),
    thereCount: Number(post.meta?.there_count ?? 0),
    captureDate: post.meta?.capture_date || null,
    setSlug: night?.slug ?? null,
  }
}
