import { defineConfig, devices } from '@playwright/test'

// Point the suite at another dev server (e.g. a worktree on a spare port) with
//   PLAYWRIGHT_BASE_URL=http://localhost:3123 npx playwright test
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const port = new URL(baseURL).port || '3000'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
