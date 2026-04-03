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
