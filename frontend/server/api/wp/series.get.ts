// GET /api/wp/series
// Returns all series taxonomy terms with their post counts.

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl

  const terms = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/series?per_page=100&orderby=name&order=asc`
  )

  return (terms ?? []).map((t: any) => ({
    id: t.id,
    name: decodeEntities(t.name ?? ''),
    slug: t.slug ?? '',
    description: t.description ?? '',
    count: t.count ?? 0,
  }))
})
