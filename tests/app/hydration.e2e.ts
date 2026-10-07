import { expect, test } from '@playwright/test'

test('the application hydrates and responds to button clicks', async ({
  page
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/home')
  await expect(
    page.locator('script[data-sdkn="@vercel/analytics/sveltekit"]')
  ).toBeAttached()
  await page.getByRole('button', { name: 'Create new canvas' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fhome$/)
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible()
  expect(errors).toEqual([])
})
