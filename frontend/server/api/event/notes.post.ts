// POST /api/event/notes  { set, name, message, hp }
// Proxies a guestbook submission to the token-protected WP write route. The note
// is created pending (held for moderation). Never cached.

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl

  const body = await readBody<{ set?: unknown; name?: unknown; message?: unknown; hp?: unknown }>(event)

  const set = typeof body?.set === 'string' && isValidSlug(body.set) ? body.set : ''
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : ''
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 600) : ''
  const hp = typeof body?.hp === 'string' ? body.hp : ''

  if (!set || !name || !message) {
    throw createError({ statusCode: 422, statusMessage: 'Name and message are required' })
  }

  const res = await wpPost<{ ok?: boolean; pending?: boolean }>(
    `${base}/wp-json/event-archive/v1/notes`,
    { set, name, message, hp }
  )
  if (!res?.ok) {
    throw createError({ statusCode: 502, statusMessage: 'Could not save the memory' })
  }

  return { ok: true, pending: true }
})
