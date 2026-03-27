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
  return {
    id:      post.id,
    title:   decodeEntities(post.title?.rendered ?? ''),
    caption: stripTags(post.content?.rendered ?? ''),
    date:    post.date ?? '',
    slug:    post.slug ?? '',
    url:     post.link ?? '',
    image: {
      src:    media?.source_url
           ?? media?.media_details?.sizes?.large?.source_url
           ?? media?.media_details?.sizes?.medium_large?.source_url
           ?? '',
      alt:    media?.alt_text || post.title?.rendered || '',
      width:  media?.media_details?.width  ?? null,
      height: media?.media_details?.height ?? null,
    },
  }
}

async function wpFetch<T>(url: string): Promise<T | null> {
  try {
    const resp  = await fetch(url, { headers: { Accept: 'application/json' } })
    const text  = await resp.text()
    const start = text.search(/[\[{]/)
    if (start === -1) return null
    return JSON.parse(text.slice(start)) as T
  } catch {
    return null
  }
}

function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/g,           ' ')
    .replace(/&amp;/g,            '&')
    .replace(/&lt;/g,             '<')
    .replace(/&gt;/g,             '>')
    .replace(/&quot;/g,           '"')
    .replace(/&#8216;|&#8217;/g,  "'")
    .replace(/&#8220;|&#8221;/g,  '"')
    .replace(/&#8211;/g,          '–')
    .replace(/&#8212;/g,          '—')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<[^>]+>/g, '')
      .replace(/\s*read more\s*$/i, '')
  ).trim()
}
