// GET /api/wp/stories/
// Returns a paginated list of story CPT posts (documentary essays).
// Separate from /api/wp/stories.get.ts which serves the homepage carousel
// from regular WP posts with the "feature" category.
//
// Query params:
//   page     - Page number (default 1)
//   per_page - Items per page (1-24, default 12)
//   series   - Filter by series slug
//   subject  - Filter by subject slug

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl
  const query = getQuery(event)

  const page = clampInt(query.page, 1, 100, 1)
  const perPage = clampInt(query.per_page, 1, 24, 12)

  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    status: 'publish',
    orderby: 'date',
    order: 'desc',
    _embed: 'wp:featuredmedia',
  })

  if (query.series && typeof query.series === 'string' && isValidSlug(query.series)) {
    params.set('series', query.series)
  }
  if (query.subject && typeof query.subject === 'string' && isValidSlug(query.subject)) {
    params.set('subject', query.subject)
  }

  const url = `${base}/wp-json/wp/v2/stories?${params.toString()}`
  const { data: posts, total, totalPages } = await wpFetchWithHeaders<any[]>(url)

  const stories = (Array.isArray(posts) ? posts : []).map((post: any) => {
    const media = post._embedded?.['wp:featuredmedia']?.[0]
    return {
      id: post.id,
      title: decodeEntities(post.title?.rendered ?? ''),
      slug: post.slug ?? '',
      date: post.date ?? '',
      excerpt: stripTags(post.excerpt?.rendered ?? ''),
      featuredImage: media ? {
        src: media.source_url ?? null,
        alt: media.alt_text || '',
        width: media.media_details?.width ?? null,
        height: media.media_details?.height ?? null,
      } : null,
      series: extractTerms(post, 'series'),
      subjects: extractTerms(post, 'subject'),
    }
  })

  return { stories, total, totalPages, page, perPage }
})

function extractTerms(post: any, taxonomy: string) {
  const terms = post._embedded?.['wp:term'] ?? []
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
