// GET /api/photo
// Returns a paginated list of photos from the photo archive.
// Supports filtering by series and subject taxonomy slugs.
//
// Query params:
//   page     - Page number (default 1)
//   per_page - Items per page (1-24, default 12)
//   series   - Filter by series slug
//   subject  - Filter by subject slug
//   orderby  - Sort field: "date" or "meta_value_num" for archive_number (default "date")
//   order    - "asc" or "desc" (default "desc")

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl
  const query = getQuery(event)

  const page = clampInt(query.page, 1, 100, 1)
  const perPage = clampInt(query.per_page, 1, 24, 12)

  // Build WP API URL with validated params
  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    status: 'publish',
    _embed: 'wp:featuredmedia',
  })

  // Order
  const allowedOrder = ['asc', 'desc'] as const
  const order = allowedOrder.includes(query.order as any) ? query.order as string : 'desc'
  params.set('order', order)

  // Orderby: standard WP REST API values only
  const allowedOrderby = ['date', 'title', 'slug', 'modified'] as const
  const orderby = allowedOrderby.includes(query.orderby as any) ? query.orderby as string : 'date'
  params.set('orderby', orderby)

  // Taxonomy filters
  if (query.series && typeof query.series === 'string' && isValidSlug(query.series)) {
    params.set('series', query.series)
  }
  if (query.subject && typeof query.subject === 'string' && isValidSlug(query.subject)) {
    params.set('subject', query.subject)
  }

  const url = `${base}/wp-json/wp/v2/photos?${params.toString()}`
  const { data: posts, total, totalPages } = await wpFetchWithHeaders<any[]>(url)

  const photos = (Array.isArray(posts) ? posts : []).map(toPhoto)

  return { photos, total, totalPages, page, perPage }
})

function toPhoto(post: any) {
  const media = post._embedded?.['wp:featuredmedia']?.[0]
  const archiveNumber = post.meta?.archive_number ?? null

  return {
    id: post.id,
    title: decodeEntities(post.title?.rendered ?? ''),
    slug: post.slug ?? '',
    archiveNumber: archiveNumber ? String(archiveNumber).padStart(3, '0') : null,
    location: post.meta?.location ?? null,
    dateTaken: post.meta?.date_taken ?? null,
    camera: post.meta?.camera ?? null,
    excerpt: stripTags(post.excerpt?.rendered ?? ''),
    images: extractWpImages(media),
    series: extractTerms(post, 'series'),
    subjects: extractTerms(post, 'subject'),
  }
}

function extractTerms(post: any, taxonomy: string) {
  const terms = post._embedded?.['wp:term'] ?? []
  // wp:term is an array of arrays (one per taxonomy registered on the CPT)
  for (const group of terms) {
    if (Array.isArray(group) && group.length > 0 && group[0]?.taxonomy === taxonomy) {
      return group.map((t: any) => ({
        id: t.id,
        name: decodeEntities(t.name ?? ''),
        slug: t.slug ?? '',
        count: t.count ?? 0,
      }))
    }
  }
  return []
}
