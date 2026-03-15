// GET /api/photo/random
// Returns a single random photo from the photo site via WP REST API.
// Falls back to the legacy `project` CPT if the `photo` CPT has no content yet.

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const photoBase = config.photoSiteUrl

  // Try new `photo` CPT first (has rich metadata), fall back to legacy `project` CPT
  const endpoint = await resolveEndpoint(photoBase)
  if (!endpoint) return null

  const { base, total } = endpoint
  const offset = Math.floor(Math.random() * total)

  const photos = await $fetch<any[]>(
    `${photoBase}/wp-json/wp/v2/${base}?per_page=1&offset=${offset}&_fields=id,title,slug,link,meta&_embed=wp:featuredmedia`,
    { headers: { Accept: 'application/json' } }
  ).catch(() => null)

  const photo = photos?.[0]
  if (!photo) return null

  const thumbnail =
    photo._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.medium?.source_url ??
    photo._embedded?.['wp:featuredmedia']?.[0]?.source_url ??
    null

  const archiveNumber = photo.meta?.archive_number ?? null

  return {
    id: photo.id,
    title: photo.title?.rendered ?? '',
    archiveNumber: archiveNumber ? String(archiveNumber).padStart(3, '0') : null,
    location: photo.meta?.location ?? null,
    dateTaken: photo.meta?.date_taken ?? null,
    camera: photo.meta?.camera ?? null,
    url: photo.link ?? `${photoBase}/archive/${photo.slug}`,
    thumbnail,
  }
})

async function resolveEndpoint(
  photoBase: string
): Promise<{ base: string; total: number } | null> {
  for (const base of ['photos', 'project']) {
    const resp = await fetch(
      `${photoBase}/wp-json/wp/v2/${base}?per_page=1&_fields=id`,
      { headers: { Accept: 'application/json' } }
    ).catch(() => null)

    if (!resp?.ok) continue
    const total = Number(resp.headers.get('X-WP-Total') ?? 0)
    if (total > 0) return { base, total }
  }
  return null
}
