import { test, expect, type Page } from '@playwright/test'

const PAGE = '/photographs/cold-turkey-cape-town'

// Headless Chromium allows autoplay, so the SoundCloud Widget API actually
// plays here — which lets us assert on the REAL playing state (the EQ + label
// are driven by the widget's PLAY/PAUSE events, not merely by the open flag).
test.describe('Cold Turkey mix player', () => {
  test('clicking play actually starts audio and reflects real state', async ({ page }) => {
    await page.goto(PAGE)
    const toggle = page.locator('button.mix__toggle')
    await expect(toggle).toBeVisible({ timeout: 15000 })

    // Idle: not playing.
    await expect(page.locator('.mix__label')).toHaveText(/play the mix/i)
    await expect(page.locator('.mix__eq--on')).toHaveCount(0)

    // The Widget API script must be allowed by CSP and load.
    await toggle.click()
    await page.waitForFunction(() => !!(window as any).SC?.Widget, null, { timeout: 15000 })

    // The PLAY event flips the EQ on + label to "Stop the mix". This only
    // happens on a real PLAY event, so it proves audio started, not just intent.
    await expect(page.locator('.mix__eq--on')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.mix__label')).toHaveText(/stop the mix/i)

    // The autoplay-blocked hint must NOT be showing when playback succeeded.
    await expect(page.locator('.mix__hint')).toHaveCount(0)
  })

  test('pause stops playback but keeps the iframe (no remount race)', async ({ page }) => {
    await page.goto(PAGE)
    const toggle = page.locator('button.mix__toggle')
    await toggle.click()
    await expect(page.locator('.mix__eq--on')).toBeVisible({ timeout: 15000 })

    // Pause.
    await toggle.click()
    await expect(page.locator('.mix__eq--on')).toHaveCount(0, { timeout: 5000 })
    await expect(page.locator('.mix__label')).toHaveText(/play the mix/i)
    // Iframe persists so resume is instant and gesture-tied (no fresh-iframe
    // autoplay race).
    await expect(page.locator('.mix__frame')).toHaveCount(1)

    // Resume on the existing widget.
    await toggle.click()
    await expect(page.locator('.mix__eq--on')).toBeVisible({ timeout: 15000 })
  })
})
