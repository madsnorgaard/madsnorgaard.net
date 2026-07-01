// GET /api/event/top?count=12 — the most-liked photos for the "Top picks" rail.
// Core wp/v2 can't order event-photos by the like_count meta, so we get the
// ranked IDs from the event-archive plugin's /top endpoint, then expand them via
// the existing photos endpoint (?ids keeps the like-ranked order via include).
export default defineEventHandler(async (event) => {
  const base = useRuntimeConfig().photoSiteUrl
  const count = Math.min(24, Math.max(1, Number(getQuery(event).count) || 12))

  const top = await $fetch<{ ids: number[] }>(
    `${base}/wp-json/event-archive/v1/top`,
    { query: { count } },
  ).catch(() => ({ ids: [] as number[] }))

  const ids = (top?.ids ?? []).filter((n) => Number.isFinite(n) && n > 0)
  if (!ids.length) return { photos: [] }

  const res = await $fetch<{ photos: any[] }>('/api/event/photos', {
    query: { ids: ids.join(',') },
  }).catch(() => ({ photos: [] as any[] }))

  return { photos: res?.photos ?? [] }
})
