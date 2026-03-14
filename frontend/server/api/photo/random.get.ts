// GET /api/photo/random
// Returns a single random photo from the photo site via WP REST API

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const photoBase = config.photoSiteUrl

  // Get total count first
  const countResp = await $fetch<any[]>(
    `${photoBase}/wp-json/wp/v2/photos?per_page=1&_fields=id`,
    { headers: { Accept: 'application/json' } }
  ).catch(() => null)

  if (!countResp) {
    return null
  }

  // WP REST API returns total in header X-WP-Total; use a random offset
  // Since we can't easily get headers with $fetch, use a fixed page count estimate
  // and pick a random page. The photo site should have <= 200 photos initially.
  const randomOffset = Math.floor(Math.random() * 50)

  const photos = await $fetch<any[]>(
    `${photoBase}/wp-json/wp/v2/photos?per_page=1&offset=${randomOffset}&_fields=id,title,slug,link,meta,_embedded&_embed=1`,
    { headers: { Accept: 'application/json' } }
  ).catch(() => null)

  const photo = photos?.[0]
  if (!photo) return null

  const archiveNumber = photo.meta?.archive_number
  const thumbnail =
    photo._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.medium?.source_url ??
    photo._embedded?.['wp:featuredmedia']?.[0]?.source_url ??
    null

  return {
    id: photo.id,
    title: photo.title?.rendered ?? '',
    archiveNumber: archiveNumber ? String(archiveNumber).padStart(3, '0') : null,
    url: photo.link ?? `${photoBase}/archive/${photo.slug}`,
    thumbnail,
  }
})
