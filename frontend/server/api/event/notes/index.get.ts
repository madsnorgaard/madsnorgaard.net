// GET /api/event/notes?set=<slug>
// Approved guestbook notes for one night. Only published (moderator-approved)
// notes are ever returned (enforced server-side by the WP security filter).

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl
  const query = getQuery(event)

  const slug =
    query.set && typeof query.set === 'string' && isValidSlug(query.set) ? query.set : ''
  if (!slug) return { notes: [] }

  // Resolve the night's term id (WP taxonomy filters want ids, not slugs).
  const terms = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/event-sets?slug=${encodeURIComponent(slug)}&_fields=id,slug&per_page=1`
  )
  const termId = Array.isArray(terms) && terms[0]?.id ? Number(terms[0].id) : 0
  if (!termId) return { notes: [] }

  const posts = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/event-notes?event_set=${termId}&status=publish&per_page=50&orderby=date&order=desc`
  )

  const notes = (Array.isArray(posts) ? posts : []).map((p: any) => ({
    id: p.id,
    name: decodeEntities(p.meta?.author_name || 'Anonymous'),
    message: stripTags(p.content?.rendered ?? ''),
    date: p.date ?? null,
  }))

  return { notes }
})
