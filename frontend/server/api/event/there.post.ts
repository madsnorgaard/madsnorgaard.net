// POST /api/event/there  { id }
// Proxies an "I was there" reaction to the token-protected WP write route.
// Same security model as like.post.ts. Never cached.

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl

  const body = await readBody<{ id?: unknown }>(event)
  const id = clampInt(body?.id, 1, Number.MAX_SAFE_INTEGER, 0)
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid photo id' })
  }

  const res = await wpPost<{ id: number; there_count: number }>(
    `${base}/wp-json/event-archive/v1/photos/${id}/there`,
    {}
  )
  if (!res) {
    throw createError({ statusCode: 502, statusMessage: 'Reaction failed' })
  }

  return { id: res.id, thereCount: Number(res.there_count ?? 0) }
})
