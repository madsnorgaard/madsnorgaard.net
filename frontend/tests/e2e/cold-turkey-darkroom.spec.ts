import { test, expect, type Page, type Locator } from '@playwright/test'

const PAGE = '/photographs/cold-turkey-cape-town'

// Run serially against one page: the Nuxt dev server (the Playwright target) is
// prone to a vue-router SSR crash under many rapid renders, so we load the page
// once and drive the rest through client-side interaction.
test.describe.configure({ mode: 'serial' })

async function gotoWall(page: Page): Promise<void> {
  await page.goto(PAGE)
  // Tiles render once the first page of photos resolves.
  await page.locator('.tile').first().waitFor({ state: 'visible', timeout: 20000 })
}

function readVar(spot: Locator, name: string): Promise<number> {
  return spot.evaluate((el, n) => {
    const v = (el as HTMLElement).style.getPropertyValue(n) || getComputedStyle(el).getPropertyValue(n)
    return parseFloat(v)
  }, name)
}

async function enterDarkroom(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: /darkroom/i })
  await btn.waitFor({ state: 'visible', timeout: 20000 })
  await btn.click()
}

test.describe('Cold Turkey darkroom + depth', () => {
  test('darkroom toggle reveals the spotlight and dims the wall', async ({ page }) => {
    await gotoWall(page)
    // Off by default: no spotlight overlay, wall not dimmed.
    await expect(page.locator('.atmos__spot')).toHaveCount(0)
    await expect(page.locator('.wall-section--dark').first()).toHaveCount(0)

    await enterDarkroom(page)
    await page.mouse.move(500, 360)

    await expect(page.locator('.atmos__spot')).toBeVisible()
    await expect(page.locator('.wall-section--dark').first()).toBeVisible()

    // The button reports its on-state.
    await expect(page.getByRole('button', { name: /darkroom/i })).toHaveClass(/ctct-tool--on/)
  })

  test('spotlight follows the cursor in VIEWPORT coords, even after scrolling', async ({ page }) => {
    await gotoWall(page)
    await enterDarkroom(page)
    const spot = page.locator('.atmos__spot')

    // At the top, the light pool sits where the cursor is.
    await page.mouse.move(500, 360)
    await page.waitForTimeout(120)
    expect(await readVar(spot, '--mx')).toBeCloseTo(500, 0)
    expect(await readVar(spot, '--my')).toBeCloseTo(360, 0)

    // Scroll deep into the wall, then move the cursor to a fresh viewport point.
    // The pool must stay at that viewport Y (~320), NOT page Y (~320 + 1600).
    // This is the regression for the "spotlight stops further down the page" bug
    // (it used page coordinates against a position:fixed overlay).
    await page.mouse.wheel(0, 1600)
    await page.waitForTimeout(120)
    await page.mouse.move(540, 320)
    await page.waitForTimeout(120)

    const my = await readVar(spot, '--my')
    expect(my).toBeLessThan(800) // viewport-relative, not page-relative (~1920)
    expect(my).toBeCloseTo(320, 0)
    expect(await readVar(spot, '--mx')).toBeCloseTo(540, 0)
  })

  test('hovering a tile lifts it toward the viewer (scale > 1)', async ({ page }) => {
    await gotoWall(page)
    const tile = page.locator('.tile').first()
    await tile.scrollIntoViewIfNeeded()

    const before = await tile.evaluate((el) => getComputedStyle(el).transform)
    await tile.hover()
    await page.waitForTimeout(420) // transform transition

    const after = await tile.evaluate((el) => getComputedStyle(el).transform)
    expect(after).not.toBe(before)
    // matrix(a, b, c, d, tx, ty) — a is scaleX; hover scales to 1.09.
    const scaleX = await tile.evaluate((el) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
      return m.a
    })
    expect(scaleX).toBeGreaterThan(1.02)
  })
})
