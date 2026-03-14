import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Mads Nørgaard/)
  })

  test('terminal renders', async ({ page }) => {
    await expect(page.locator('.terminal')).toBeVisible()
    await expect(page.locator('.terminal__label')).toContainText('visitor@madsnorgaard.net')
  })

  test('status block renders', async ({ page }) => {
    await expect(page.locator('.status-block')).toBeVisible()
    await expect(page.locator('.status-block__label')).toContainText('status')
  })

  test('status block shows location and employer', async ({ page }) => {
    const rows = page.locator('.status-block__row')
    await expect(rows.filter({ hasText: 'location' })).toBeVisible()
    await expect(rows.filter({ hasText: 'employer' })).toBeVisible()
  })

  test('navigation links are present', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'CV', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Writing', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible()
  })
})
