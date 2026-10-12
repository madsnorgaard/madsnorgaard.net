import { test, expect, type Page } from '@playwright/test'

function pngSize(buf: Buffer) {
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

const statValue = (page: Page, label: string | RegExp) =>
  page.locator('dl > div').filter({ has: page.locator('dt', { hasText: label }) }).locator('dd').first()

// Drag a rough triangle on the pad with the mouse.
async function drawTriangle(page: Page) {
  const pad = page.locator('.pad__canvas')
  const box = (await pad.boundingBox())!
  const p = (fx: number, fy: number) => [box.x + box.width * fx, box.y + box.height * fy] as const
  await page.mouse.move(...p(0.5, 0.2))
  await page.mouse.down()
  for (const [fx, fy] of [[0.6, 0.4], [0.8, 0.8], [0.5, 0.75], [0.2, 0.8], [0.4, 0.4], [0.5, 0.22]]) {
    await page.mouse.move(...p(fx, fy), { steps: 8 })
  }
  await page.mouse.up()
}

test.describe('Draw it, then let the circles draw it', () => {
  test('starts empty, a preset builds the machine, the slider goes to exact', async ({ page }) => {
    await page.goto('/lab/draw')
    await expect(page.locator('.pad__hint')).toBeVisible()
    await expect(page.locator('.epi__canvas')).toHaveCount(0)
    await page.getByRole('button', { name: 'Heart' }).click()
    await expect(page.locator('.epi__canvas')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.epi__n')).toHaveText('N = 8')
    await expect(statValue(page, 'Your drawing RMS error')).toHaveText(/^\d+\.\d\d%$/)
    const slider = page.locator('.epi__slider input')
    await slider.evaluate((el) => {
      const i = el as HTMLInputElement
      i.value = i.max
      i.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await expect(page.locator('.epi__n')).toHaveText('N = 128')
    await expect(statValue(page, 'Your drawing RMS error')).toHaveText('exact')
  })

  test('a mouse stroke becomes a machine and a shareable link', async ({ page }) => {
    await page.goto('/lab/draw')
    await drawTriangle(page)
    await expect(page.locator('.pad__hint')).toHaveCount(0)
    await expect(page.locator('.epi__canvas')).toBeVisible({ timeout: 20_000 })
    await expect(statValue(page, 'Rotating arms')).toHaveText('8')

    await page.locator('.lab-share').getByRole('button', { name: /share/i }).click()
    const href = await page.locator('.lab-share__link', { hasText: 'Facebook' }).getAttribute('href')
    const shared = decodeURIComponent(new URL(href!).searchParams.get('u')!)
    const d = new URL(shared).searchParams.get('d')!
    expect(d.length).toBeGreaterThan(400)

    // Opening the link reproduces the drawing and the card renders it.
    await page.goto(`/lab/draw?d=${d}&n=20`)
    await expect(page.locator('.epi__canvas')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.epi__n')).toHaveText('N = 20')
    await expect(page.locator('.pad__hint')).toHaveCount(0)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', new RegExp(`draw\\.png\\?d=${d}&n=20$`))

    const res = await page.request.get(`/og/lab/draw.png?d=${d}&n=20`)
    expect(res.status()).toBe(200)
    expect(pngSize(await res.body())).toEqual({ width: 1200, height: 630 })
    const heart = await (await page.request.get('/og/lab/draw.png')).body()
    expect((await res.body()).equals(heart)).toBe(false)
  })

  test('Clear empties the machine', async ({ page }) => {
    await page.goto('/lab/draw')
    await page.getByRole('button', { name: 'Star' }).click()
    await expect(page.locator('.epi__canvas')).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('.epi__canvas')).toHaveCount(0)
    await expect(page.locator('.pad__hint')).toBeVisible()
  })

  test('garbage in ?d= is ignored', async ({ page }) => {
    await page.goto('/lab/draw?d=not-a-drawing!!')
    await expect(page.locator('.pad__hint')).toBeVisible()
    const res = await page.request.get('/og/lab/draw.png?d=%%%')
    expect(res.status()).toBe(200) // falls back to the heart
  })

  test('listed on the lab index', async ({ page }) => {
    await page.goto('/lab')
    await expect(page.locator('.lab-list__item').nth(4)).toHaveAttribute('href', '/lab/draw')
  })
})
