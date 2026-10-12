// GET /og/lab/<slug>.png?n=150 | ?ruler=50 | ?country=Denmark
// Branded 1200x630 share card for a /lab experiment, drawn from the same data
// as the page with the visitor's current state in the query. Used as og:image
// for the lab pages and downloaded or shared as a file by the Save/Share
// control. Anything that fails falls back to the site default card.

export default defineEventHandler(async (event) => {
  // The router cannot split ":slug.png", so take the slug from the path itself.
  const slug = event.path.match(/\/og\/lab\/([a-z-]+)\.png/)?.[1] ?? ''
  if (!isLabSlug(slug)) {
    throw createError({ statusCode: 404, statusMessage: 'Unknown lab experiment' })
  }
  const q = getQuery(event)
  try {
    const base = useRuntimeConfig(event).nobelApiBase as string
    const png = await renderLabCard(slug, q, async () => (await loadNobelRows(base)).rows)
    setHeader(event, 'Content-Type', 'image/png')
    setHeader(event, 'Cache-Control', 'public, max-age=86400')
    return png
  }
  catch (err) {
    console.error('[og/lab] card render failed, falling back to the site card', { slug, q }, err)
    return sendRedirect(event, '/og-image.png', 302)
  }
})
