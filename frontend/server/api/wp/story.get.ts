// GET /api/wp/story
// Returns a single WordPress post with a featured image from madsnorgaard.net WP.
//
// Only posts in the "feature" category are eligible.
//
// Priority:
//   1. If any eligible post is marked "Sticky" in WP admin → always return that one.
//      (Toggle sticky off to return to random rotation.)
//   2. Otherwise → a random published post with a featured image.

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base   = config.photoSiteUrl

  const EMBED  = '_embed=wp:featuredmedia&_fields=id,title,slug,date,content,link,sticky,_links,_embedded'

  // ── Resolve "feature" category ID ───────────────────────────────────
  const cats = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/categories?slug=feature&_fields=id`
  )
  const featureCatId = cats?.[0]?.id
  if (!featureCatId) return null

  const categoryParam = `&categories=${featureCatId}`

  // ── 1. Sticky (spotlight) ───────────────────────────────────────────
  const sticky = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/posts?sticky=true&status=publish&per_page=100${categoryParam}&${EMBED}`
  )
  const spotlightPost = sticky?.find(p => hasImage(p))
  if (spotlightPost) return toStory(spotlightPost)

  // ── 2. Random published post ────────────────────────────────────────
  const countResp = await fetch(
    `${base}/wp-json/wp/v2/posts?per_page=1&status=publish&_fields=id${categoryParam}`,
    { headers: { Accept: 'application/json' } }
  ).catch(() => null)

  const total = Number(countResp?.headers.get('X-WP-Total') ?? 0)
  if (total === 0) return null

  for (let attempt = 0; attempt < 5; attempt++) {
    const offset = Math.floor(Math.random() * total)
    const posts  = await wpFetch<any[]>(
      `${base}/wp-json/wp/v2/posts?per_page=1&offset=${offset}&status=publish&${EMBED}${categoryParam}`
    )
    const post = posts?.[0]
    if (post && hasImage(post)) return toStory(post)
  }

  return null
})

// ── Helpers ─────────────────────────────────────────────────────────

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
      // Full original — documentary photography must not be cropped by WP thumbnails
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

// WP REST API sometimes prepends PHP warnings (e.g. DDEV + ACF).
// Extract the first JSON array/object from the raw response body.
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
    .replace(/&nbsp;/g,            ' ')
    .replace(/&amp;/g,             '&')
    .replace(/&lt;/g,              '<')
    .replace(/&gt;/g,              '>')
    .replace(/&quot;/g,            '"')
    .replace(/&#8216;|&#8217;/g,   "'")
    .replace(/&#8220;|&#8221;/g,   '"')
    .replace(/&#8211;/g,           '–')
    .replace(/&#8212;/g,           '—')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<[^>]+>/g, '')
      .replace(/\s*read more\s*$/i, '')
  ).trim()
}
