// GET /api/photo/:slug
// Returns a single photo by slug with full metadata and image sizes.

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''

  if (!isValidSlug(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid slug' })
  }

  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl

  const posts = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/photos?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia&status=publish`
  )

  const post = posts?.[0]
  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
  }

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
    content: post.content?.rendered ?? '',
    images: extractImages(media),
    series: extractTerms(post, 'series'),
    subjects: extractTerms(post, 'subject'),
  }
})

function extractImages(media: any) {
  if (!media) return null
  const sizes = media.media_details?.sizes ?? {}
  return {
    thumbnail: sizes.thumbnail?.source_url ?? null,
    medium: sizes.medium?.source_url ?? sizes.medium_large?.source_url ?? null,
    large: sizes.large?.source_url ?? null,
    full: media.source_url ?? null,
    width: media.media_details?.width ?? null,
    height: media.media_details?.height ?? null,
    alt: media.alt_text || '',
  }
}

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
