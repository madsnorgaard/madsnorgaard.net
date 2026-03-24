// GET /api/wp/story
// Returns a random WordPress post with a featured image from madsnorgaard.net WP.
// Optional query: ?category=<slug>  — filter by category slug

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.wordpressBaseUrl
  const query = getQuery(event)

  // Resolve category ID if slug provided
  let categoryParam = ''
  if (query.category && typeof query.category === 'string') {
    const cats = await wpFetch<any[]>(
      `${base}/wp-json/wp/v2/categories?slug=${encodeURIComponent(query.category)}&_fields=id`
    )
    const catId = cats?.[0]?.id
    if (catId) categoryParam = `&categories=${catId}`
  }

  // Get total post count so we can pick a random offset
  const countResp = await fetch(
    `${base}/wp-json/wp/v2/posts?per_page=1&_fields=id${categoryParam}`,
    { headers: { Accept: 'application/json' } }
  ).catch(() => null)

  const total = Number(countResp?.headers.get('X-WP-Total') ?? 0)
  if (total === 0) return null

  // Try up to 5 random picks to find one with a featured image
  for (let attempt = 0; attempt < 5; attempt++) {
    const offset = Math.floor(Math.random() * total)

    const posts = await wpFetch<any[]>(
      `${base}/wp-json/wp/v2/posts?per_page=1&offset=${offset}&_embed=wp:featuredmedia${categoryParam}&_fields=id,title,slug,date,content,link,_links,_embedded`
    )

    const post = posts?.[0]
    if (!post) continue

    const media = post._embedded?.['wp:featuredmedia']?.[0]
    if (!media) continue

    const image = {
      src:
        media.media_details?.sizes?.large?.source_url ??
        media.media_details?.sizes?.medium_large?.source_url ??
        media.media_details?.sizes?.medium?.source_url ??
        media.source_url,
      alt: media.alt_text || post.title?.rendered || '',
      width: media.media_details?.sizes?.large?.width ?? media.media_details?.width ?? null,
      height: media.media_details?.sizes?.large?.height ?? media.media_details?.height ?? null,
    }

    if (!image.src) continue

    // WP returns absolute URLs pointing to its own domain (madsnorgaard.net).
    // That domain serves Nuxt (not WP), so strip the origin — the browser
    // hits the Nuxt proxy at /wp-content/uploads/… instead.
    image.src = image.src.replace(/^https?:\/\/[^/]+(?=\/wp-content\/)/, '')

    return {
      id: post.id,
      title: decodeEntities(post.title?.rendered ?? ''),
      caption: stripTags(post.content?.rendered ?? ''),
      date: post.date ?? '',
      slug: post.slug ?? '',
      url: post.link ?? `${base}/?p=${post.id}`,
      image,
    }
  }

  return null
})

// WP REST API sometimes prepends PHP warnings (e.g. DDEV + ACF).
// Extract the first JSON array/object from the raw response body.
async function wpFetch<T>(url: string): Promise<T | null> {
  try {
    const resp = await fetch(url, { headers: { Accept: 'application/json' } })
    const text = await resp.text()
    const start = text.search(/[\[{]/)
    if (start === -1) return null
    return JSON.parse(text.slice(start)) as T
  } catch {
    return null
  }
}

function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<[^>]+>/g, '')
      .replace(/\s*read more\s*$/i, '')
  ).trim()
}
