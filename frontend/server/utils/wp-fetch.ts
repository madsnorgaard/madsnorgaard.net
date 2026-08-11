/**
 * Shared WordPress REST API fetch utilities.
 *
 * Used by all server-side API routes that call the photo.madsnorgaard.net
 * WP REST API. The browser never contacts WordPress directly - these
 * utilities are server-only.
 */

/**
 * Fetch JSON from the WordPress REST API.
 *
 * Handles a common quirk where WP prepends PHP warnings/notices
 * (e.g. DDEV + ACF deprecation notices) before the JSON body.
 * Extracts the first JSON array or object from the response text.
 *
 * Includes the X-Internal-Token header when configured, to bypass
 * the per-IP rate limit for server-to-server calls.
 */
export async function wpFetch<T>(url: string): Promise<T | null> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }

    // Internal token for rate limit bypass (set in both WP and Nuxt env).
    const token = process.env.PHOTO_API_INTERNAL_TOKEN || ''
    if (token) {
      headers['X-Internal-Token'] = token
    }

    const resp = await fetch(url, { headers })
    // A 4xx/5xx body (rate limit, WAF page) is still JSON-ish — treating it
    // as data poisons downstream consumers (and SWR caches). Fail to null.
    if (!resp.ok) return null
    const text = await resp.text()
    const start = text.search(/[\[{]/)
    if (start === -1) return null
    return JSON.parse(text.slice(start)) as T
  } catch {
    return null
  }
}

/**
 * Fetch JSON and also return the total count and page count from
 * WP REST API pagination headers.
 */
export async function wpFetchWithHeaders<T>(
  url: string
): Promise<{ data: T | null; total: number; totalPages: number }> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }

    const token = process.env.PHOTO_API_INTERNAL_TOKEN || ''
    if (token) {
      headers['X-Internal-Token'] = token
    }

    const resp = await fetch(url, { headers })
    if (!resp.ok) return { data: null, total: 0, totalPages: 0 }
    const total = Number(resp.headers.get('X-WP-Total') ?? 0)
    const totalPages = Number(resp.headers.get('X-WP-TotalPages') ?? 0)

    const text = await resp.text()
    const start = text.search(/[\[{]/)
    if (start === -1) return { data: null, total, totalPages }
    const data = JSON.parse(text.slice(start)) as T
    return { data, total, totalPages }
  } catch {
    return { data: null, total: 0, totalPages: 0 }
  }
}

/**
 * POST JSON to the WordPress REST API (server-to-server only).
 *
 * Used for the event-archive reaction write routes. Always sends the
 * X-Internal-Token header: those routes' permission_callback requires it,
 * and browsers can never reach them directly (CORS is GET/OPTIONS only).
 * Returns null on any error so callers degrade gracefully.
 */
export async function wpPost<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }

    const token = process.env.PHOTO_API_INTERNAL_TOKEN || ''
    if (token) {
      headers['X-Internal-Token'] = token
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    })
    if (!resp.ok) return null
    const text = await resp.text()
    const start = text.search(/[\[{]/)
    if (start === -1) return null
    return JSON.parse(text.slice(start)) as T
  } catch {
    return null
  }
}

/**
 * Decode common HTML entities found in WP REST API responses.
 */
export function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
}

/**
 * Strip HTML tags and decode entities. Useful for excerpts/captions.
 */
export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<[^>]+>/g, '')
      .replace(/\s*read more\s*$/i, '')
  ).trim()
}

/**
 * Hydrate legacy "Mauer Stills" gallery images in WP rendered content.
 *
 * That gallery plugin emits <img> tags carrying only a `data-id` (the WP
 * attachment ID) and no `src` - it filled the src in client-side at runtime.
 * In the headless frontend that plugin JS never runs, so the images render
 * empty. This resolves each data-id to its real source_url via the WP media
 * REST API and injects the src/alt attributes server-side.
 *
 * Returns the html unchanged when there are no such images or the media
 * lookup fails (degrades gracefully rather than throwing).
 */
export async function hydrateGalleryImages(html: string, base: string): Promise<string> {
  if (!html) return html

  const imgRe = /<img\b[^>]*>/gi

  // Collect attachment IDs from <img> tags that have a data-id but no src.
  const ids = new Set<number>()
  for (const tag of html.match(imgRe) ?? []) {
    if (/\bsrc\s*=/i.test(tag)) continue
    const m = tag.match(/\bdata-id\s*=\s*["']?(\d+)/i)
    if (m) ids.add(Number(m[1]))
  }
  if (ids.size === 0) return html

  // Batch-resolve the IDs to source URLs in a single REST call.
  const media = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/media?include=${[...ids].join(',')}&per_page=100&_fields=id,source_url,alt_text`
  )
  if (!media?.length) return html

  const byId = new Map<number, { src: string; alt: string }>()
  for (const m of media) {
    if (m?.id && m?.source_url) {
      byId.set(Number(m.id), { src: m.source_url, alt: m.alt_text || '' })
    }
  }
  if (byId.size === 0) return html

  // Inject src (+ alt + lazy loading) into each matching img tag.
  return html.replace(imgRe, (tag) => {
    if (/\bsrc\s*=/i.test(tag)) return tag
    const m = tag.match(/\bdata-id\s*=\s*["']?(\d+)/i)
    const info = m && byId.get(Number(m[1]))
    if (!info) return tag
    const altAttr = /\balt\s*=/i.test(tag) ? '' : ` alt="${escapeAttr(info.alt)}"`
    const loadingAttr = /\bloading\s*=/i.test(tag) ? '' : ' loading="lazy"'
    return tag.replace(/^<img\b/i, `<img src="${escapeAttr(info.src)}"${altAttr}${loadingAttr}`)
  })
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Validate a URL slug: lowercase alphanumeric and hyphens only.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(slug)
}

/**
 * Clamp an integer to a range.
 */
export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.floor(n)))
}
