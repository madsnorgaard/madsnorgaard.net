// GET /api/wp/stories
// Returns up to 8 WordPress posts with featured images from the "feature" category.
// Used by OnePictureStory for slow image rotation. Client shuffles for random order.

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base   = config.photoSiteUrl

  const EMBED = '_embed=wp:featuredmedia&_fields=id,title,slug,date,content,link,_links,_embedded'

  const cats = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/categories?slug=feature&_fields=id`
  )
  const featureCatId = cats?.[0]?.id
  if (!featureCatId) return []

  const posts = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/posts?per_page=20&status=publish&categories=${featureCatId}&${EMBED}`
  )

  return (posts ?? []).filter(hasImage).slice(0, 8).map(toStory)
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function hasImage(post: any): boolean {
  const media = post._embedded?.['wp:featuredmedia']?.[0]
  return !!(
    media?.source_url ??
    media?.media_details?.sizes?.large?.source_url ??
    media?.media_details?.sizes?.medium_large?.source_url
  )
}

function toStory(post: any) {
  const media = post._embedded?.['wp:featuredmedia']?.[0]
  const image = extractFeaturedImage(media)
  return {
    id:      post.id,
    title:   decodeEntities(post.title?.rendered ?? ''),
    caption: stripTags(post.content?.rendered ?? ''),
    date:    post.date ?? '',
    slug:    post.slug ?? '',
    url:     post.link ?? '',
    image: {
      ...image,
      src: image?.src ?? '',
      alt: media?.alt_text || post.title?.rendered || '',
    },
  }
}
