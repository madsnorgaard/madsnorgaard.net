import { test, expect, type Page } from '@playwright/test'
import nobelFixture from './fixtures/nobel.json' with { type: 'json' }

// Range inputs: set the value the way a drag would, so v-model picks it up.
async function slide(page: Page, selector: string, value: string | number) {
  await page.locator(selector).evaluate((el, v) => {
    const input = el as HTMLInputElement
    input.value = String(v)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}

const statValue = (page: Page, label: string | RegExp) =>
  page.locator('dl > div').filter({ has: page.locator('dt', { hasText: label }) }).locator('dd').first()

test.describe('Lab index', () => {
  test('lists the five experiments and links to each', async ({ page }) => {
    await page.goto('/lab')
    await expect(page.locator('h1')).toHaveText(/Maps, maths/)
    const items = page.locator('.lab-list__item')
    await expect(items).toHaveCount(5)
    const hrefs = await items.evaluateAll((els) => els.map((a) => a.getAttribute('href')))
    expect(hrefs).toEqual([
      '/lab/fourier-south-africa',
      '/lab/fourier-denmark',
      '/lab/coastline-paradox',
      '/lab/nobel-lines',
      '/lab/draw',
    ])
  })

  test('is reachable from the site nav', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Lab', exact: true }).click()
    await expect(page).toHaveURL(/\/lab\/?$/)
  })
})

test.describe('Fourier: South Africa', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lab/fourier-south-africa')
    // Hydration + a 50 KB fetch + a 1400-point DFT: slow on a cold dev server with parallel workers.
    await expect(page.locator('.epi__canvas')).toBeVisible({ timeout: 20_000 })
    await expect(statValue(page, 'South Africa RMS error')).not.toHaveText('-', { timeout: 10_000 })
  })

  test('draws two outlines with the default 150 arms each', async ({ page }) => {
    await expect(page.locator('.epi__n')).toHaveText('N = 150')
    await expect(statValue(page, 'Rotating arms')).toHaveText('300')
    await expect(statValue(page, 'South Africa RMS error')).toHaveText(/^\d+\.\d\d%$/)
    await expect(statValue(page, 'Lesotho RMS error')).toHaveText(/^\d+\.\d\d%$/)
  })

  test('slider changes the arm count and the error', async ({ page }) => {
    const before = await statValue(page, 'South Africa RMS error').textContent()
    await slide(page, '.epi__slider input', 0)
    await expect(page.locator('.epi__n')).toHaveText('N = 1')
    await expect(statValue(page, 'Rotating arms')).toHaveText('2')
    const after = await statValue(page, 'South Africa RMS error').textContent()
    expect(parseFloat(after!)).toBeGreaterThan(parseFloat(before!))
    await expect(page.locator('.epi__slider input')).toHaveAttribute('aria-valuetext', 'N = 1')
  })

  test('Lesotho becomes exact once N covers all its points', async ({ page }) => {
    const max = await page.locator('.epi__slider input').getAttribute('max')
    await slide(page, '.epi__slider input', max!)
    await expect(page.locator('.epi__n')).toHaveText('N = 800')
    await expect(statValue(page, 'Lesotho RMS error')).toHaveText('exact')
  })

  test('play, arms and outline toggles flip their labels', async ({ page }) => {
    const play = page.getByRole('button', { name: /pause|play/i })
    await expect(play).toHaveText('Pause')
    await play.click()
    await expect(play).toHaveText('Play')
    const arms = page.getByRole('button', { name: /arms/i })
    await arms.click()
    await expect(arms).toHaveText('Show arms')
    await expect(arms).toHaveAttribute('aria-pressed', 'false')
    const ghost = page.getByRole('button', { name: /outline/i })
    await ghost.click()
    await expect(ghost).toHaveText('Show outline')
  })

  test('the canvas has no page-level horizontal overflow on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const w = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(w).toBeLessThanOrEqual(390)
  })
})

test.describe('Fourier: Denmark', () => {
  test('draws fifteen landmasses and rolls the small ones up', async ({ page }) => {
    await page.goto('/lab/fourier-denmark')
    await expect(page.locator('.epi__canvas')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.lab__intro')).toContainText('15 separate chains')
    await expect(page.getByText(/This map knows Jutland, Zealand, Funen.*and Anholt\./)).toBeVisible()
    await expect(statValue(page, 'Jutland RMS error')).toHaveText(/^\d+\.\d\d%$/)
    await expect(statValue(page, 'Other 12 RMS error')).toHaveText(/exact|avg/)
    await expect(page.locator('.epi__n')).toHaveText('N = 80')
  })
})

test.describe('Coastline paradox', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lab/coastline-paradox')
    await expect(page.locator('.coast__map')).toHaveCount(2)
  })

  const km = async (page: Page, country: string) => {
    const txt = await page.locator('.coast__map').filter({ hasText: country }).locator('.coast__len').textContent()
    return parseInt(txt!.replace(/[^\d]/g, ''), 10)
  }

  test('starts at a 50 km ruler and shows both lengths', async ({ page }) => {
    await expect(page.locator('.coast__value')).toHaveText('50 km')
    expect(await km(page, 'Denmark')).toBeGreaterThan(1000)
    expect(await km(page, 'South Africa')).toBeGreaterThan(2000)
    await expect(page.locator('.coast__series')).toHaveText([/Denmark · D ≈ 1\.\d\d/, /South Africa · D ≈ 1\.\d\d/])
  })

  test('Denmark grows far more than South Africa as the ruler shrinks', async ({ page }) => {
    const dk50 = await km(page, 'Denmark')
    const za50 = await km(page, 'South Africa')
    await slide(page, '.coast__slider input', 0) // log10(1) = 1 km
    await expect(page.locator('.coast__value')).toHaveText('1.0 km')
    await expect(page.locator('.coast__slider input')).toHaveAttribute('aria-valuetext', '1.0 kilometres')
    const dk1 = await km(page, 'Denmark')
    const za1 = await km(page, 'South Africa')
    expect(dk1 / dk50).toBeGreaterThan(2)
    expect(za1 / za50).toBeLessThan(1.5)
  })

  test('a 200 km ruler all but erases Denmark', async ({ page }) => {
    const max = await page.locator('.coast__slider input').getAttribute('max')
    await slide(page, '.coast__slider input', max!)
    await expect(page.locator('.coast__value')).toHaveText('200 km')
    expect(await km(page, 'Denmark')).toBeLessThan(600)
    expect(await km(page, 'South Africa')).toBeGreaterThan(2000)
  })

  test('chart keeps its labels readable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const svg = page.locator('.coast__chart-svg')
    await expect.poll(async () => {
      const vb = await svg.getAttribute('viewBox')
      const width = await svg.evaluate((el) => el.getBoundingClientRect().width)
      return Math.abs(parseFloat(vb!.split(' ')[2]) - width)
    }).toBeLessThan(2)
  })
})

test.describe('Nobel lines', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/lab/nobel', (route) => route.fulfill({ json: nobelFixture }))
  })

  test('opens on South Africa with arcs, home dots and a where-the-lines-go headline', async ({ page }) => {
    await page.goto('/lab/nobel-lines')
    await expect(statValue(page, 'Born in South Africa')).toHaveText('10')
    await expect(statValue(page, 'Won at home')).toHaveText('6')
    await expect(statValue(page, 'Won from abroad')).toHaveText('4')
    await expect(page.locator('.nf__headline')).toHaveText(/^Lines out of South Africa end in United States of America \(4\)\.$/)
    await expect(page.getByText(/four science lines out of South Africa/i)).toBeVisible()
    await expect(page.locator('.nf__arc')).toHaveCount(4)
    await expect(page.locator('.nf__home')).toHaveCount(6)
    await expect(page.locator('.nf__table tbody tr')).toHaveCount(10)
    await expect(page.locator('.nf__table')).toContainText('Mandela')
  })

  test('switches to Denmark via the chip', async ({ page }) => {
    await page.goto('/lab/nobel-lines')
    await page.getByRole('button', { name: 'Denmark' }).click()
    await expect(page.getByRole('button', { name: 'Denmark' })).toHaveAttribute('aria-pressed', 'true')
    await expect(statValue(page, 'Born in Denmark')).toHaveText(/^\d+$/)
    await expect(statValue(page, 'Won from abroad')).toHaveText('0')
    await expect(page.locator('.nf__headline')).toHaveText(/^Lines into Denmark come from United States of America \(1\)\.$/)
    await expect(page.locator('.nf__arc--in')).toHaveCount(1) // Mottelson, USA -> Denmark
    await expect(page.locator('.nf__legend')).toContainText('born abroad, won from Denmark')
  })

  test('Everyone shows one arc per route and a flows table', async ({ page }) => {
    await page.goto('/lab/nobel-lines')
    await page.getByRole('button', { name: 'Everyone' }).click()
    await expect(statValue(page, 'Prizes to people')).toHaveText(String(nobelFixture.rows.length))
    await expect(page.locator('.nf__table thead')).toContainText('Prizes')
    await expect(page.locator('.nf__table tbody tr').first()).toContainText('United States of America')
    expect(await page.locator('.nf__arc').count()).toBeGreaterThan(5)
    await expect(page.locator('.nf__home')).toHaveCount(0)
  })

  test('Luthuli is explained and findable under Zimbabwe', async ({ page }) => {
    await page.goto('/lab/nobel-lines')
    await expect(page.getByText(/Albert Luthuli.*Bulawayo/)).toBeVisible()
    await page.locator('.nf__select select').selectOption('Zimbabwe')
    await expect(page.locator('.nf__table')).toContainText('Lutuli')
    await expect(page.locator('.nf__home--peace')).toHaveCount(1)
  })

  test('the old brain-drain URL redirects to the new one', async ({ page }) => {
    const res = await page.goto('/lab/nobel-brain-drain?country=Denmark')
    expect(res?.request().redirectedFrom()?.url()).toContain('/lab/nobel-brain-drain')
    expect(page.url()).toContain('/lab/nobel-lines')
  })

  test('shows a friendly message when the Nobel API is down', async ({ page }) => {
    await page.route('**/api/lab/nobel', (route) => route.fulfill({ status: 502, json: { statusMessage: 'nope' } }))
    await page.goto('/lab/nobel-lines')
    await expect(page.locator('.lab-error')).toContainText('did not answer')
    await expect(page.locator('.nf')).toHaveCount(0)
  })
})
