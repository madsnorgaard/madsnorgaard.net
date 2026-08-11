import { test, expect, type Page } from '@playwright/test'

// The shared PhotoLightbox must be dismissable from every close path: the
// Escape key, the on-screen "esc" button, and a backdrop click. Regression
// coverage for the bug where /proj/<slug> bound v-model:active but close()
// only emitted `close`, leaving the overlay stuck open forever.

test.describe.configure({ mode: 'serial' })

const TILE = '.project-detail__single, .composite__item, .gallery__item'
const CT_PAGE = '/photographs/cold-turkey-cape-town'

// Found once by the first test (serial mode), reused by the rest.
let projSlug: string | null = null

async function openProjLightbox(page: Page) {
  await page.goto(`/proj/${projSlug}`)
  const tile = page.locator(TILE).first()
  await tile.waitFor({ state: 'visible', timeout: 20000 })
  await tile.click()
  await expect(page.locator('.lightbox')).toBeVisible({ timeout: 10000 })
}

test.describe('Project page lightbox (/proj/<slug>)', () => {
  test('a project with images opens the lightbox', async ({ page }) => {
    const res = await page.request.get('/api/wp/projects?per_page=6')
    test.skip(!res.ok(), 'WP projects API unreachable')
    const projects: Array<{ slug: string }> = (await res.json())?.projects ?? []
    test.skip(projects.length === 0, 'no projects published')

    for (const p of projects) {
      await page.goto(`/proj/${p.slug}`)
      const tile = page.locator(TILE).first()
      const hasTile = await tile.waitFor({ state: 'visible', timeout: 15000 })
        .then(() => true, () => false)
      if (hasTile) {
        projSlug = p.slug
        break
      }
    }
    test.skip(!projSlug, 'no project with gallery images found')

    await page.locator(TILE).first().click()
    await expect(page.locator('.lightbox')).toBeVisible({ timeout: 10000 })
  })

  test('Escape key closes the lightbox', async ({ page }) => {
    test.skip(!projSlug, 'no project with gallery images found')
    await openProjLightbox(page)
    await page.keyboard.press('Escape')
    await expect(page.locator('.lightbox')).toBeHidden({ timeout: 5000 })
  })

  test('the esc close button closes the lightbox', async ({ page }) => {
    test.skip(!projSlug, 'no project with gallery images found')
    await openProjLightbox(page)
    await page.locator('.lightbox__close').click()
    await expect(page.locator('.lightbox')).toBeHidden({ timeout: 5000 })
  })

  test('clicking the backdrop closes the lightbox', async ({ page }) => {
    test.skip(!projSlug, 'no project with gallery images found')
    await openProjLightbox(page)
    // The frame is 92vw x 90dvh centered, so the top sliver is pure backdrop.
    await page.locator('.lightbox').click({ position: { x: 200, y: 6 } })
    await expect(page.locator('.lightbox')).toBeHidden({ timeout: 5000 })
  })

  test('arrow keys still navigate between images', async ({ page }) => {
    test.skip(!projSlug, 'no project with gallery images found')
    await openProjLightbox(page)
    const total = await page.locator('.lightbox__counter-total').textContent()
    test.skip(!total || parseInt(total, 10) < 2, 'project has a single image')
    const counter = page.locator('.lightbox__counter-current')
    await expect(counter).toHaveText('01')
    await page.keyboard.press('ArrowRight')
    await expect(counter).toHaveText('02')
    await page.keyboard.press('ArrowLeft')
    await expect(counter).toHaveText('01')
  })
})

// The event wall page wires the lightbox differently (one-way :active +
// @close driving the ?photo= URL param) — make sure the component fix
// doesn't bypass that flow.
test.describe('Cold Turkey wall lightbox regression', () => {
  test('Escape closes the lightbox and clears ?photo from the URL', async ({ page }) => {
    await page.goto(CT_PAGE)
    const tile = page.locator('.tile').first()
    await tile.waitFor({ state: 'visible', timeout: 20000 })
    // Tiles are SSR-rendered, so an immediate click can land before hydration
    // attaches the handler — retry until the lightbox actually opens.
    await expect(async () => {
      await tile.click()
      await expect(page.locator('.lightbox')).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 20000 })
    await expect(page).toHaveURL(/photo=/)

    await page.keyboard.press('Escape')
    await expect(page.locator('.lightbox')).toBeHidden({ timeout: 5000 })
    await expect(page).not.toHaveURL(/photo=/)
  })

  test('close button dismisses a ?photo deep link', async ({ page }) => {
    const idRes = await page.request.get('/api/event/photos?page=1')
    test.skip(!idRes.ok(), 'event photos API unreachable')
    const id = (await idRes.json())?.photos?.[0]?.id
    test.skip(typeof id !== 'number', 'no event photos published')

    await page.goto(`${CT_PAGE}?photo=${id}`)
    await expect(page.locator('.lightbox')).toBeVisible({ timeout: 15000 })
    await page.locator('.lightbox__close').click()
    await expect(page.locator('.lightbox')).toBeHidden({ timeout: 5000 })
    await expect(page).not.toHaveURL(/photo=/)
  })
})
