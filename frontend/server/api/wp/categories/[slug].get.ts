// GET /api/wp/categories/:slug
// Returns a WP category term and its posts (standard WP posts, not custom post types).
// Mirrors the WordPress /category/{slug}/ archive page.

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''

  if (!isValidSlug(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid slug' })
  }

  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl
  const query = getQuery(event)

  const page = clampInt(query.page, 1, 100, 1)
  const perPage = clampInt(query.per_page, 1, 24, 12)

  // Resolve category term by slug
  const terms = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/categories?slug=${encodeURIComponent(slug)}`
  )
  const term = terms?.[0]
  if (!term) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  // Fetch posts in this category
  const { data: posts, total, totalPages } = await wpFetchWithHeaders<any[]>(
    `${base}/wp-json/wp/v2/posts?categories=${term.id}&per_page=${perPage}&page=${page}&_embed=wp:featuredmedia,wp:term&status=publish&orderby=date&order=desc`
  )

  return {
    term: {
      id: term.id,
      name: decodeEntities(term.name ?? ''),
      slug: term.slug ?? '',
      description: term.description ?? '',
      count: term.count ?? 0,
    },
    posts: (posts ?? []).map(toPostSummary),
    total,
    totalPages,
  }
})

function toPostSummary(post: any) {
  const media = post._embedded?.['wp:featuredmedia']?.[0]
  return {
    id: post.id,
    title: decodeEntities(post.title?.rendered ?? ''),
    slug: post.slug ?? '',
    date: post.date ?? '',
    excerpt: stripTags(post.excerpt?.rendered ?? ''),
    featuredImage: media ? {
      src: media.source_url
        ?? media.media_details?.sizes?.large?.source_url
        ?? media.media_details?.sizes?.medium_large?.source_url
        ?? null,
      alt: media.alt_text || '',
      width: media.media_details?.width ?? null,
      height: media.media_details?.height ?? null,
    } : null,
    categories: extractTermGroup(post, 'category'),
    tags: extractTermGroup(post, 'post_tag'),
  }
}

function extractTermGroup(post: any, taxonomy: string) {
  const groups = post._embedded?.['wp:term'] ?? []
  for (const group of groups) {
    if (Array.isArray(group) && group.length > 0 && group[0]?.taxonomy === taxonomy) {
      return group.map((t: any) => ({
        id: t.id,
        name: decodeEntities(t.name ?? ''),
        slug: t.slug ?? '',
      }))
    }
  }
  return []
}
