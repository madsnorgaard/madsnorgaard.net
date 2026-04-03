// GET /api/wp/series/:slug
// Returns photos and stories tagged with a given series term.

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

  // Resolve the series term ID from the slug
  const terms = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/series?slug=${encodeURIComponent(slug)}`
  )
  const term = terms?.[0]
  if (!term) {
    throw createError({ statusCode: 404, statusMessage: 'Series not found' })
  }

  // Fetch photos and stories in this series in parallel
  const [photosResult, storiesResult] = await Promise.all([
    wpFetchWithHeaders<any[]>(
      `${base}/wp-json/wp/v2/photos?series=${term.id}&per_page=${perPage}&page=${page}&_embed=wp:featuredmedia&status=publish`
    ),
    wpFetch<any[]>(
      `${base}/wp-json/wp/v2/stories?series=${term.id}&per_page=50&_embed=wp:featuredmedia&status=publish`
    ),
  ])

  return {
    term: {
      id: term.id,
      name: decodeEntities(term.name ?? ''),
      slug: term.slug ?? '',
      description: term.description ?? '',
      count: term.count ?? 0,
    },
    photos: (photosResult.data ?? []).map(toPhotoSummary),
    photosTotal: photosResult.total,
    photosTotalPages: photosResult.totalPages,
    stories: (storiesResult ?? []).map(toStorySummary),
  }
})

function toPhotoSummary(post: any) {
  const media = post._embedded?.['wp:featuredmedia']?.[0]
  const archiveNumber = post.meta?.archive_number ?? null
  return {
    id: post.id,
    title: decodeEntities(post.title?.rendered ?? ''),
    slug: post.slug ?? '',
    archiveNumber: archiveNumber ? String(archiveNumber).padStart(3, '0') : null,
    images: media ? {
      thumbnail: media.media_details?.sizes?.thumbnail?.source_url ?? null,
      medium: media.media_details?.sizes?.medium?.source_url ?? null,
      large: media.media_details?.sizes?.large?.source_url ?? null,
      full: media.source_url ?? null,
      alt: media.alt_text || '',
    } : null,
  }
}

function toStorySummary(post: any) {
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
    } : null,
  }
}
