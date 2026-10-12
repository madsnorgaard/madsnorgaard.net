import { test, expect, type Page } from '@playwright/test'
import nobelFixture from './fixtures/nobel.json' with { type: 'json' }

// PNG header: 8-byte signature, then the IHDR chunk whose data starts with
// width and height as big-endian 32-bit integers.
function pngSize(buf: Buffer) {
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

async function slide(page: Page, selector: string, value: string | number) {
  await page.locator(selector).evaluate((el, v) => {
    const input = el as HTMLInputElement
    input.value = String(v)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}

const ogImage = (page: Page) => page.locator('meta[property="og:image"]').getAttribute('content')

test.describe('Lab share cards (/og/lab)', () => {
  for (const path of [
    'fourier-south-africa.png',
    'fourier-south-africa.png?n=20',
    'fourier-denmark.png',
    'coastline-paradox.png?ruler=5',
  ]) {
    test(`${path} is a 1200x630 PNG`, async ({ request }) => {
      const res = await request.get(`/og/lab/${path}`)
      expect(res.status()).toBe(200)
      expect(res.headers()['content-type']).toContain('image/png')
      expect(pngSize(await res.body())).toEqual({ width: 1200, height: 630 })
    })
  }

  test('different state draws a different picture', async ({ request }) => {
    const a = await (await request.get('/og/lab/coastline-paradox.png?ruler=2')).body()
    const b = await (await request.get('/og/lab/coastline-paradox.png?ruler=150')).body()
    expect(a.equals(b)).toBe(false)
  })

  test('the Nobel card renders, or falls back to the site card when the API is unreachable', async ({ request }) => {
    const res = await request.get('/og/lab/nobel-brain-drain.png?country=Denmark', { maxRedirects: 0 })
    if (res.status() === 302) {
      expect(res.headers()['location']).toBe('/og-image.png')
      test.info().annotations.push({ type: 'note', description: 'Nobel API unreachable: fallback card served' })
      return
    }
    expect(res.status()).toBe(200)
    expect(pngSize(await res.body())).toEqual({ width: 1200, height: 630 })
  })

  test('an unknown experiment is a 404, not a card', async ({ request }) => {
    const res = await request.get('/og/lab/bogus.png', { maxRedirects: 0 })
    expect(res.status()).toBe(404)
  })
})

test.describe('Lab pages advertise their own share card', () => {
  test('index and experiments point og:image at /og/lab', async ({ page }) => {
    await page.goto('/lab')
    expect(await ogImage(page)).toMatch(/\/og\/lab\/fourier-south-africa\.png$/)
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')

    await page.goto('/lab/fourier-denmark')
    expect(await ogImage(page)).toMatch(/\/og\/lab\/fourier-denmark\.png$/)
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200')
  })

  test('shared state is carried into the preview image and og:url', async ({ page }) => {
    await page.goto('/lab/coastline-paradox?ruler=5')
    expect(await ogImage(page)).toMatch(/coastline-paradox\.png\?ruler=5$/)
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', /\/lab\/coastline-paradox\?ruler=5$/)
  })
})

test.describe('Lab share control', () => {
  test('opens the Fourier page at the shared arm count and shares that state', async ({ page }) => {
    await page.goto('/lab/fourier-south-africa?n=20')
    await expect(page.locator('.epi__n')).toHaveText('N = 20', { timeout: 20_000 })
    // Snapped: ?n=21 is not a slider step, so it lands on the nearest one.
    await page.goto('/lab/fourier-south-africa?n=21')
    await expect(page.locator('.epi__n')).toHaveText('N = 20', { timeout: 20_000 })

    const share = page.locator('.lab-share')
    await expect(share.getByRole('button', { name: 'Save image' })).toBeVisible()
    // No navigator.share in headless Chromium: the fallback menu opens.
    await share.getByRole('button', { name: /share/i }).click()
    const wa = share.locator('.lab-share__link', { hasText: 'WhatsApp' })
    await expect(wa).toHaveAttribute('href', /lab%2Ffourier-south-africa%3Fn%3D20/)

    // Moving the slider changes what gets shared.
    await slide(page, '.epi__slider input', 0)
    await expect(page.locator('.epi__n')).toHaveText('N = 1')
    await expect(wa).toHaveAttribute('href', /fourier-south-africa%3Fn%3D1(?!\d)/)
  })

  test('default state shares a clean URL', async ({ page }) => {
    await page.goto('/lab/coastline-paradox')
    await expect(page.locator('.coast__value')).toHaveText('50 km')
    await page.locator('.lab-share').getByRole('button', { name: /share/i }).click()
    const fb = page.locator('.lab-share__link', { hasText: 'Facebook' })
    await expect(fb).toHaveAttribute('href', /lab%2Fcoastline-paradox$/)
  })

  test('coastline opens at the shared ruler length', async ({ page }) => {
    await page.goto('/lab/coastline-paradox?ruler=5')
    await expect(page.locator('.coast__value')).toHaveText('5.0 km')
    await page.goto('/lab/coastline-paradox?ruler=9999')
    await expect(page.locator('.coast__value')).toHaveText('200 km')
  })

  test('Nobel opens on the shared country and on everyone', async ({ page }) => {
    await page.route('**/api/lab/nobel', (route) => route.fulfill({ json: nobelFixture }))
    await page.goto('/lab/nobel-brain-drain?country=Denmark')
    await expect(page.getByRole('button', { name: 'Denmark' })).toHaveAttribute('aria-pressed', 'true')
    await page.goto('/lab/nobel-brain-drain?country=everyone')
    await expect(page.getByRole('button', { name: 'Everyone' })).toHaveAttribute('aria-pressed', 'true')
    await page.locator('.lab-share').getByRole('button', { name: /share/i }).click()
    await expect(page.locator('.lab-share__link', { hasText: 'X' })).toHaveAttribute('href', /country%3Deveryone/)
  })

  test('Save image downloads the card for the current state', async ({ page }) => {
    await page.goto('/lab/coastline-paradox?ruler=5')
    await expect(page.locator('.coast__value')).toHaveText('5.0 km')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.lab-share').getByRole('button', { name: 'Save image' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('coastline-paradox-ruler-5.0.png')
    const path = await download.path()
    const { readFileSync } = await import('node:fs')
    expect(pngSize(readFileSync(path!))).toEqual({ width: 1200, height: 630 })
  })
})
