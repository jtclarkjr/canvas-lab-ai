import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/storybook',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:6006',
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixels: 0
    }
  },
  webServer: {
    command:
      'node node_modules/sirv-cli/bin.js storybook-static --port 6006 --single --host 127.0.0.1',
    url: 'http://127.0.0.1:6006',
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: 'visual-chromium',
      testMatch: /visual\.e2e\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1
      }
    },
    {
      name: 'visual-firefox',
      testMatch: /visual\.e2e\.ts/,
      grep: /@cross-browser-visual/,
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1
      }
    },
    {
      name: 'visual-webkit',
      testMatch: /visual\.e2e\.ts/,
      grep: /@cross-browser-visual/,
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1
      }
    },
    {
      name: 'behavior-chromium',
      testMatch: /behavior\.e2e\.ts/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'behavior-firefox',
      testMatch: /behavior\.e2e\.ts/,
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'behavior-webkit',
      testMatch: /behavior\.e2e\.ts/,
      use: { ...devices['Desktop Safari'] }
    }
  ]
})
