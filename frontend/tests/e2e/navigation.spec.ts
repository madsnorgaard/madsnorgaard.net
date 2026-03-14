import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('CV page loads', async ({ page }) => {
    await page.getByRole('link', { name: /cv/i }).click()
    await expect(page).toHaveURL(/\/cv/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Writing page loads', async ({ page }) => {
    await page.getByRole('link', { name: 'Writing', exact: true }).click()
    await expect(page).toHaveURL(/\/writing/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Projects page loads', async ({ page }) => {
    await page.getByRole('link', { name: 'Projects', exact: true }).click()
    await expect(page).toHaveURL(/\/projects/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('navigating back to home works', async ({ page }) => {
    await page.goto('/cv')
    await page.locator('a[href="/"]').first().click()
    await expect(page).toHaveURL('http://localhost:3000/')
  })
})
