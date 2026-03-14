import { test, expect } from '@playwright/test'

async function focusTerminal(page: import('@playwright/test').Page) {
  // Wait for Vue hydration: hidden input must exist and have type="text" (set by Vue v-model)
  await page.waitForFunction(() => {
    const el = document.querySelector('.terminal__hidden-input') as HTMLInputElement | null
    return el?.type === 'text'
  })
  // Focus directly via JS; pointer-events: none blocks Playwright click, not JS focus
  await page.evaluate(() => {
    ;(document.querySelector('.terminal__hidden-input') as HTMLInputElement)?.focus()
  })
}

async function runCommand(page: import('@playwright/test').Page, command: string) {
  const prevCount = await page.locator('.terminal__history-item').count()
  await page.keyboard.type(command)
  await page.keyboard.press('Enter')
  await expect(page.locator('.terminal__history-item')).toHaveCount(prevCount + 1, { timeout: 10_000 })
}

test.describe('Terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await focusTerminal(page)
  })

  test('renders with correct prompt', async ({ page }) => {
    await expect(page.locator('.terminal__prompt')).toContainText('visitor@madsnorgaard.net:~$')
  })

  test('whoami: returns name and bio', async ({ page }) => {
    await runCommand(page, 'whoami')
    const output = page.locator('.terminal__history-item').last().locator('.terminal__output-text')
    await expect(output).toContainText('Mads Nørgaard')
    await expect(output).toContainText('Skanderborg, Denmark')
  })

  test('help: lists available commands', async ({ page }) => {
    await runCommand(page, 'help')
    const output = page.locator('.terminal__history-item').last().locator('.terminal__output-text')
    await expect(output).toContainText('Available commands')
    await expect(output).toContainText('whoami')
    await expect(output).toContainText('skills')
    await expect(output).toContainText('contact')
  })

  test('sudo: reports to sudoers', async ({ page }) => {
    await runCommand(page, 'sudo')
    const output = page.locator('.terminal__history-item').last().locator('.terminal__output-text')
    await expect(output).toContainText('sudoers')
  })

  test('git blame: returns witty response', async ({ page }) => {
    await runCommand(page, 'git blame')
    const output = page.locator('.terminal__history-item').last().locator('.terminal__output-text')
    await expect(output).toContainText('your fault')
  })

  test('exit: refuses to let you leave', async ({ page }) => {
    await runCommand(page, 'exit')
    const output = page.locator('.terminal__history-item').last().locator('.terminal__output-text')
    await expect(output).toContainText('You cannot leave')
  })

  test('unknown command: shows not found message', async ({ page }) => {
    await runCommand(page, 'foobar')
    const output = page.locator('.terminal__history-item').last().locator('.terminal__output-text')
    await expect(output).toContainText('command not found')
    await expect(output).toContainText("Type 'help'")
  })

  test('arrow-up restores previous command', async ({ page }) => {
    // Run a command first
    await runCommand(page, 'whoami')

    // Press arrow up to restore history
    await page.keyboard.press('ArrowUp')

    // The displayed input should show previous command
    await expect(page.locator('.terminal__input-display')).toContainText('whoami')
  })

  test('tab completes whoami from "who"', async ({ page }) => {
    await page.keyboard.type('who')
    await page.keyboard.press('Tab')
    await expect(page.locator('.terminal__input-display')).toContainText('whoami')
  })

  test('skills: lists technologies', async ({ page }) => {
    await runCommand(page, 'skills')
    const output = page.locator('.terminal__history-item').last().locator('.terminal__output-text')
    await expect(output).toContainText('Drupal')
    await expect(output).toContainText('Docker')
  })

  test('contact: shows email', async ({ page }) => {
    await runCommand(page, 'contact')
    const output = page.locator('.terminal__history-item').last().locator('.terminal__output-text')
    await expect(output).toContainText('mads@madsnorgaard.net')
  })

  test('git status: shows clean working tree', async ({ page }) => {
    await runCommand(page, 'git status')
    const output = page.locator('.terminal__history-item').last().locator('.terminal__output-text')
    await expect(output).toContainText('nothing to commit')
  })

  test('clear: empties history', async ({ page }) => {
    await runCommand(page, 'whoami')
    await expect(page.locator('.terminal__history-item')).toHaveCount(1)

    await page.keyboard.type('clear')
    await page.keyboard.press('Enter')

    await expect(page.locator('.terminal__history-item')).toHaveCount(0)
  })
})
