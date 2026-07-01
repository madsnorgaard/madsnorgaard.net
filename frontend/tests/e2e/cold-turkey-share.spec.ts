import { test, expect } from '@playwright/test'

const PAGE = '/photographs/cold-turkey-cape-town'

async function firstPhotoId(request: any): Promise<number> {
  const res = await request.get('/api/event/photos?page=1')
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const id = body?.photos?.[0]?.id
  expect(typeof id).toBe('number')
  return id
}

test.describe('Cold Turkey per-photo sharing', () => {
  test('homepage OG card renders (font fix)', async ({ request }) => {
    const res = await request.get('/og-image.png')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('image/png')
  })

  test('per-photo branded card renders as PNG 1200x630', async ({ request }) => {
    const id = await firstPhotoId(request)
    const res = await request.get(`/og/ct/${id}.png`)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('image/png')
    // PNG IHDR: width/height are big-endian uint32 at byte offsets 16 and 20.
    const buf = await res.body()
    expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG')
    expect(buf.readUInt32BE(16)).toBe(1200)
    expect(buf.readUInt32BE(20)).toBe(630)
  })

  test('SSR meta for ?photo deep-links the per-photo card + title', async ({ request }) => {
    const id = await firstPhotoId(request)
    const res = await request.get(`${PAGE}?photo=${id}`)
    const html = await res.text()
    // og:image + twitter:image point at this photo's branded card.
    expect(html).toContain(`/og/ct/${id}.png`)
    // Per-night title.
    expect(html).toMatch(/property="og:title"[^>]*content="Cold Turkey Cape Town: /)
    // og:url carries the deep-link in production (nuxt-seo-utils keeps the
    // whitelisted ?photo param); dev mode strips it, so this is a soft check.
    const ogUrl = html.match(/property="og:url"[^>]*content="([^"]*)"/)?.[1] ?? ''
    if (!ogUrl.includes(`photo=${id}`)) {
      console.warn(`[note] og:url lacks ?photo in this env (dev strips it): ${ogUrl}`)
    }
  })

  test('Share button shows in the lightbox on a deep link', async ({ page }) => {
    const idRes = await page.request.get('/api/event/photos?page=1')
    const id = (await idRes.json())?.photos?.[0]?.id
    await page.goto(`${PAGE}?photo=${id}`)
    await expect(page.getByRole('button', { name: /share this photo/i })).toBeVisible({ timeout: 15000 })
  })

  // The Top picks rail depends on the WP /top endpoint; tolerate it being absent
  // until that plugin change is deployed.
  test('Top picks rail is well-formed when present', async ({ page }) => {
    await page.goto(PAGE)
    const rail = page.locator('.toppicks')
    if (await rail.count()) {
      await expect(rail.locator('.toppicks__item').first()).toBeVisible()
    }
  })

  // Regression: ?set must actually narrow the wall. The WP REST tax filter param
  // is the rest_base ('event-sets'), not the taxonomy name ('event_set') — using
  // the wrong one silently returned every night.
  test('selecting a set filters the wall to that night', async ({ request }) => {
    const all = await (await request.get('/api/event/photos?page=1')).json()
    const sets = (await (await request.get('/api/event/sets')).json())?.sets ?? []
    test.skip(sets.length < 2, 'need >=2 sets to prove filtering')
    const slug = sets[0].slug
    const filtered = await (await request.get(`/api/event/photos?page=1&set=${slug}`)).json()
    expect(filtered.total).toBeGreaterThan(0)
    expect(filtered.total).toBeLessThan(all.total)
  })
})
