// GET /api/event/photo/:id
// Single event_photo, used for the deep-link / Open Graph path (a shared
// ?photo=<id> link). Short SWR so a freshly shared photo's counts are current.

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl

  const id = clampInt(getRouterParam(event, 'id'), 1, Number.MAX_SAFE_INTEGER, 0)
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid photo id' })
  }

  const post = await wpFetch<any>(
    `${base}/wp-json/wp/v2/event-photos/${id}?_embed=wp:featuredmedia,wp:term`
  )
  if (!post?.id) {
    throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
  }

  const media = post._embedded?.['wp:featuredmedia']?.[0]
  const setTerms = post._embedded?.['wp:term']?.flat?.() ?? []
  const night = setTerms.find((t: any) => t?.taxonomy === 'event_set' && t?.parent)
    ?? setTerms.find((t: any) => t?.taxonomy === 'event_set')

  return {
    id: post.id,
    images: extractImages(media),
    likeCount: Number(post.meta?.like_count ?? 0),
    thereCount: Number(post.meta?.there_count ?? 0),
    captureDate: post.meta?.capture_date || null,
    setSlug: night?.slug ?? null,
    setName: night ? decodeEntities(night.name ?? '') : null,
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
