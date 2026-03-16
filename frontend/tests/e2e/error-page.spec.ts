import { test, expect } from '@playwright/test'

test.describe('Error page (404)', () => {
  test('renders the diagnostic terminal on a missing route', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist', { waitUntil: 'networkidle' })

    // Should return 404 status
    expect(response?.status()).toBe(404)

    // Screenshot: initial state (boot sequence may still be running)
    await page.screenshot({ path: 'tests/e2e/screenshots/error-404-initial.png', fullPage: true })

    // Wait for the diagnostic terminal to appear
    await expect(page.locator('.error-terminal')).toBeVisible({ timeout: 5000 })

    // Title bar should show diagnostics label and error code badge
    await expect(page.locator('.error-terminal__label')).toContainText('diagnostics@madsnorgaard.net')
    await expect(page.locator('.error-terminal__code')).toContainText('404')
  })

  test('boot sequence runs and shows FAIL line', async ({ page }) => {
    await page.goto('/this-page-does-not-exist', { waitUntil: 'networkidle' })

    // Wait for the boot sequence to complete — look for the FAIL line
    await expect(
      page.locator('.error-terminal__line--fail', { hasText: 'FAIL' })
    ).toBeVisible({ timeout: 10000 })

    // OK lines should also be present (handshake, backend, etc.)
    const okLines = page.locator('.error-terminal__line--ok')
    await expect(okLines.first()).toBeVisible()
    expect(await okLines.count()).toBeGreaterThanOrEqual(4)

    // Screenshot after boot completes
    await page.screenshot({ path: 'tests/e2e/screenshots/error-404-boot-done.png', fullPage: true })
  })

  test('shows ASCII art error code', async ({ page }) => {
    await page.goto('/this-page-does-not-exist', { waitUntil: 'networkidle' })

    // Wait for ASCII art (lines with box-drawing characters)
    await expect(
      page.locator('.error-terminal__line--ascii').first()
    ).toBeVisible({ timeout: 10000 })

    // Wait for all ASCII lines to render (35ms delay between each)
    const asciiLines = page.locator('.error-terminal__line--ascii')
    await expect(asciiLines).toHaveCount(8, { timeout: 5000 })
  })

  test('shows recovery routes after boot', async ({ page }) => {
    await page.goto('/this-page-does-not-exist', { waitUntil: 'networkidle' })

    // Wait for the recovery routes section
    await expect(
      page.locator('.error-terminal__line--accent', { hasText: 'recovery routes' })
    ).toBeVisible({ timeout: 10000 })

    // Check destination routes are listed
    await expect(page.locator('.error-terminal__line--dim', { hasText: 'home' })).toBeVisible()
    await expect(page.locator('.error-terminal__line--dim', { hasText: 'writing' })).toBeVisible()
    await expect(page.locator('.error-terminal__line--dim', { hasText: 'projects' })).toBeVisible()
    await expect(page.locator('.error-terminal__line--dim', { hasText: 'cv' })).toBeVisible()
  })

  test('interactive prompt appears and accepts commands', async ({ page }) => {
    await page.goto('/this-page-does-not-exist', { waitUntil: 'networkidle' })

    // Wait for the prompt to appear (means boot is complete)
    await expect(page.locator('.error-terminal__current')).toBeVisible({ timeout: 12000 })
    await expect(page.locator('.error-terminal__prompt', { hasText: 'visitor@madsnorgaard.net:~$' })).toBeVisible()

    // Screenshot: fully booted with interactive prompt
    await page.screenshot({ path: 'tests/e2e/screenshots/error-404-interactive.png', fullPage: true })

    // Focus the hidden input and type a command
    await page.evaluate(() => {
      ;(document.querySelector('.error-terminal__hidden-input') as HTMLInputElement)?.focus()
    })

    await page.keyboard.type('help')
    await page.keyboard.press('Enter')

    // Should show help output
    await expect(page.locator('.error-terminal__output-text', { hasText: 'Available commands' })).toBeVisible({ timeout: 5000 })

    // Screenshot: after help command
    await page.screenshot({ path: 'tests/e2e/screenshots/error-404-help.png', fullPage: true })
  })

  test('typing a route name navigates away from error', async ({ page }) => {
    await page.goto('/this-page-does-not-exist', { waitUntil: 'networkidle' })

    // Wait for prompt
    await expect(page.locator('.error-terminal__current')).toBeVisible({ timeout: 12000 })

    // Focus and type "home"
    await page.evaluate(() => {
      ;(document.querySelector('.error-terminal__hidden-input') as HTMLInputElement)?.focus()
    })

    await page.keyboard.type('writing')
    await page.keyboard.press('Enter')

    // Should navigate to /writing
    await page.waitForURL('**/writing', { timeout: 10000 })
    expect(page.url()).toContain('/writing')
  })

  test('site header navigation is present on error page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist', { waitUntil: 'networkidle' })

    await expect(page.locator('.site-header__logo')).toBeVisible()
    await expect(page.locator('.site-nav')).toBeVisible()
    await expect(page.locator('.site-nav a', { hasText: 'CV' })).toBeVisible()
    await expect(page.locator('.site-nav a', { hasText: 'Writing' })).toBeVisible()
  })

  test('visual appearance - spectrum stripe and CRT scanlines', async ({ page }) => {
    await page.goto('/this-page-does-not-exist', { waitUntil: 'networkidle' })

    await expect(page.locator('.error-terminal')).toBeVisible({ timeout: 5000 })

    // Spectrum stripe should exist
    await expect(page.locator('.error-terminal__spectrum')).toBeAttached()

    // Terminal dots (red/yellow/green) in title bar
    await expect(page.locator('.error-terminal__dot--red')).toBeVisible()
    await expect(page.locator('.error-terminal__dot--yellow')).toBeVisible()
    await expect(page.locator('.error-terminal__dot--green')).toBeVisible()

    // Cursor should be blinking (exists in DOM)
    await expect(page.locator('.error-terminal__current')).toBeVisible({ timeout: 12000 })
    await expect(page.locator('.error-terminal__cursor')).toBeVisible()
  })
})
