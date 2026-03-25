// GET /api/wp/photos
// Returns a batch of photos from madsnorgaard.net WP.
// Sticky posts (spotlight) are always first.
// Query params:
//   ?page=1     — pagination (default 1)
//   ?per_page=20 — items per page (default 20)

export default defineEventHandler(async (event) => {
  const config  = useRuntimeConfig(event)
  const base    = config.wordpressBaseUrl
  const q       = getQuery(event)
  const page    = Math.max(1, Number(q.page ?? 1))
  const perPage = Math.min(50, Number(q.per_page ?? 20))

  // Fetch sticky (spotlight) and regular posts in parallel
  const [sticky, regular] = await Promise.all([
    // Spotlight: sticky posts (max 5 — shouldn't need more)
    wpFetch<any[]>(`${base}/wp-json/wp/v2/posts?sticky=true&status=publish&per_page=5&_embed=wp:featuredmedia&_fields=id,title,slug,date,link,sticky,content,_links,_embedded`),
    // Regular posts (non-sticky, newest first)
    wpFetch<any[]>(`${base}/wp-json/wp/v2/posts?sticky=false&status=publish&per_page=${perPage}&page=${page}&orderby=date&order=desc&_embed=wp:featuredmedia&_fields=id,title,slug,date,link,sticky,content,_links,_embedded`),
  ])

  return [...(sticky ?? []), ...(regular ?? [])]
    .map(post => toPhoto(post))
    .filter(Boolean)
})

function toPhoto(post: any) {
  const media = post._embedded?.['wp:featuredmedia']?.[0]
  const src   =
    media?.source_url ??
    media?.media_details?.sizes?.large?.source_url ??
    media?.media_details?.sizes?.medium_large?.source_url ??
    null

  if (!src) return null

  return {
    id:      post.id,
    title:   decodeEntities(post.title?.rendered ?? ''),
    caption: stripTags(post.content?.rendered ?? ''),
    date:    post.date ?? '',
    slug:    post.slug ?? '',
    url:     post.link ?? `${post.slug}`,
    sticky:  post.sticky ?? false,
    image: {
      src,
      alt:    media?.alt_text || post.title?.rendered || '',
      width:  media?.media_details?.width  ?? null,
      height: media?.media_details?.height ?? null,
    },
  }
}

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

function decodeEntities(str: string) {
  return str
    .replace(/&nbsp;/g,  ' ')
    .replace(/&amp;/g,   '&')
    .replace(/&lt;/g,    '<')
    .replace(/&gt;/g,    '>')
    .replace(/&quot;/g,  '"')
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s*read more\s*$/i, '')
  ).trim()
}
