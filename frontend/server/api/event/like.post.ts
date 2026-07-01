// POST /api/event/like  { id }
// Proxies a public "like" tap to the token-protected WP write route. The browser
// can never reach WP directly (CORS is GET/OPTIONS only); this server route holds
// the internal token. Never cached (see routeRules in nuxt.config).

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl

  const body = await readBody<{ id?: unknown }>(event)
  const id = clampInt(body?.id, 1, Number.MAX_SAFE_INTEGER, 0)
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid photo id' })
  }

  const res = await wpPost<{ id: number; like_count: number }>(
    `${base}/wp-json/event-archive/v1/photos/${id}/like`,
    {}
  )
  if (!res) {
    throw createError({ statusCode: 502, statusMessage: 'Like failed' })
  }

  return { id: res.id, likeCount: Number(res.like_count ?? 0) }
})
