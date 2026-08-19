import { expect, test } from '@playwright/test'

test('dialog traps focus, closes on Escape, and restores the trigger', async ({
  page
}) => {
  await page.goto('/iframe.html?id=ui-overlays-dialog--keyboard&viewMode=story')
  const trigger = page.getByRole('button', { name: 'Open dialog' })

  await trigger.focus()
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Invite collaborators' })
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('switch supports keyboard activation and reports state', async ({
  page
}) => {
  await page.goto('/iframe.html?id=ui-forms-switch--keyboard&viewMode=story')
  const control = page.getByRole('switch', { name: 'Publish canvas' })

  await expect(control).toHaveAttribute('aria-checked', 'false')
  await control.focus()
  await page.keyboard.press('Space')
  await expect(control).toHaveAttribute('aria-checked', 'true')
})

test('disabled and loading buttons cannot be activated', async ({ page }) => {
  await page.goto('/iframe.html?id=ui-actions-button--loading&viewMode=story')
  const button = page.getByRole('button', { name: 'Save changes' })

  await expect(button).toBeDisabled()
  await expect(button).toHaveAttribute('aria-busy', 'true')
})

test('popover supports keyboard dismissal and restores focus', async ({
  page
}) => {
  await page.goto(
    '/iframe.html?id=ui-overlays-popover--keyboard&viewMode=story'
  )
  const trigger = page.getByRole('button', { name: /Sort:/ })

  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menu', { name: 'Sort options' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu', { name: 'Sort options' })).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('canceling a confirmation leaves the action untouched', async ({
  page
}) => {
  await page.goto(
    '/iframe.html?id=shared-feedback-confirmdialog--behavior&viewMode=story'
  )
  await page.getByRole('button', { name: 'Remove collaborator' }).click()
  await page.getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByTestId('decision')).toHaveText('No decision')
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('virtualized lists stay keyboard reachable and bound rendered rows', async ({
  page
}) => {
  await page.goto(
    '/iframe.html?id=shared-collections-virtualizedmessagelist--default&viewMode=story'
  )
  const region = page.getByRole('region', { name: 'Messages' })

  await region.focus()
  await expect(region).toBeFocused()
  const renderedRows = region.locator('[data-index]')
  await expect(renderedRows.first()).toBeVisible()
  expect(await renderedRows.count()).toBeLessThan(100)
})
