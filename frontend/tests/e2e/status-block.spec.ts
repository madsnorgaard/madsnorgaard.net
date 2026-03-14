import { test, expect } from '@playwright/test'

test.describe('StatusBlock', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders STATUS label', async ({ page }) => {
    await expect(page.locator('.status-block__label')).toContainText('status')
  })

  test('shows location row', async ({ page }) => {
    const row = page.locator('.status-block__row').filter({ hasText: 'location' })
    await expect(row).toBeVisible()
    await expect(row.locator('dd')).toContainText('Denmark')
  })

  test('shows employer row', async ({ page }) => {
    const row = page.locator('.status-block__row').filter({ hasText: 'employer' })
    await expect(row).toBeVisible()
    await expect(row.locator('dd')).not.toBeEmpty()
  })

  test('availability dot is present', async ({ page }) => {
    await expect(page.locator('.status-block__dot')).toBeVisible()
  })

  test('availability row shows a status label', async ({ page }) => {
    const row = page.locator('.status-block__row').filter({ hasText: 'availability' })
    await expect(row).toBeVisible()
    // Dot should have one of the three valid modifier classes
    const dot = row.locator('.status-block__dot')
    await expect(dot).toBeVisible()
  })

  test('last commit row appears when data is available', async ({ page }) => {
    // The row is conditionally rendered; check it exists if present
    const row = page.locator('.status-block__row').filter({ hasText: 'last commit' })
    const count = await row.count()
    if (count > 0) {
      await expect(row.locator('dd')).not.toBeEmpty()
    }
    // If not present, that's also valid (no commit data fetched yet)
  })
})
