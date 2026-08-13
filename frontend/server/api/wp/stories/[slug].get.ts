// GET /api/wp/stories/:slug
// Returns a single story (documentary essay) by slug with structured
// blocks_data and resolved photo references for the Nuxt block renderer.

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''

  if (!isValidSlug(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid slug' })
  }

  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl

  const posts = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/stories?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia&_resolve_photos=1&status=publish`
  )

  const post = posts?.[0]
  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Story not found' })
  }

  const media = post._embedded?.['wp:featuredmedia']?.[0]

  return {
    id: post.id,
    title: decodeEntities(post.title?.rendered ?? ''),
    slug: post.slug ?? '',
    date: post.date ?? '',
    excerpt: stripTags(post.excerpt?.rendered ?? ''),
    featuredImage: extractFeaturedImage(media),
    // Structured block data for the Vue block renderer
    blocks: post.blocks_data ?? [],
    // Resolved photo data keyed by photo ID
    resolvedPhotos: post.resolved_photos ?? {},
    // Fallback rendered HTML (for search engines / RSS)
    contentRendered: post.content?.rendered ?? '',
    series: extractTerms(post, 'series'),
    subjects: extractTerms(post, 'subject'),
  }
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
