import { test, expect } from '@playwright/test'

test('blog post images load correctly', async ({ page }) => {
  await page.goto('/writing/when-time-stands-still-afrapix-archives-living-digital-history', { waitUntil: 'networkidle' })

  await page.screenshot({ path: 'tests/e2e/screenshots/blog-post-images.png', fullPage: true })

  const images = page.locator('.post-body img')
  const count = await images.count()
  console.log(`Image count in post body: ${count}`)

  expect(count, 'post should contain inline images').toBeGreaterThan(0)

  const broken: string[] = []
  for (let i = 0; i < count; i++) {
    const img = images.nth(i)
    // Scroll into view to trigger lazy loading
    await img.scrollIntoViewIfNeeded()
    // Wait for load (with timeout per image)
    await img.evaluate((el: HTMLImageElement) =>
      el.complete
        ? true
        : new Promise(r => { el.onload = () => r(true); el.onerror = () => r(false); setTimeout(() => r(false), 5000) })
    )
    const src = await img.getAttribute('src') || ''
    const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth)
    console.log(`  img[${i}]: src=${src.substring(0, 80)} naturalWidth=${naturalWidth}`)
    if (naturalWidth === 0) broken.push(src)
  }

  console.log(`Broken images: ${broken.length}`)
  broken.forEach(s => console.log(`  BROKEN: ${s}`))
  expect(broken, 'all images should load').toHaveLength(0)
})
