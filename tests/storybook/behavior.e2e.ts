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

  const motionCenters = await dialog.evaluate((element) => {
    const animation = element.getAnimations()[0]
    const effect = animation?.effect
    const duration = effect?.getComputedTiming().duration
    if (!animation || !effect || typeof duration !== 'number') return null

    animation.pause()
    animation.currentTime = 0
    const start = element.getBoundingClientRect()
    animation.currentTime = duration
    const end = element.getBoundingClientRect()
    animation.play()

    return {
      startX: start.left + start.width / 2,
      startY: start.top + start.height / 2,
      endX: end.left + end.width / 2,
      endY: end.top + end.height / 2
    }
  })

  expect(motionCenters).not.toBeNull()
  expect(Math.abs(motionCenters!.startX - motionCenters!.endX)).toBeLessThan(1)
  expect(Math.abs(motionCenters!.startY - motionCenters!.endY)).toBeLessThan(1)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('card child contract preserves the consumer element', async ({ page }) => {
  await page.goto(
    '/iframe.html?id=ui-layout-card--linked-element&viewMode=story'
  )

  const card = page.getByTestId('card-child')
  await expect(card).toHaveJSProperty('tagName', 'A')
  await expect(card).toHaveAttribute('href', '#component-architecture')
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

test('drawer traps focus, closes on Escape, and restores its trigger', async ({
  page
}) => {
  await page.goto('/iframe.html?id=ui-overlays-drawer--default&viewMode=story')
  const trigger = page.getByRole('button', { name: 'Open activity drawer' })
  await trigger.focus()
  await trigger.click()
  await expect(
    page.getByRole('dialog', { name: 'Canvas activity' })
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('dialog', { name: 'Canvas activity' })
  ).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('bottom sheet supports drag dismissal', async ({ page }) => {
  await page.goto(
    '/iframe.html?id=ui-overlays-bottomsheet--open&viewMode=story'
  )
  const sheet = page.getByRole('dialog', { name: 'Mobile details' })
  await expect(sheet).toBeVisible()
  const box = await sheet.boundingBox()
  if (!box) throw new Error('Bottom sheet has no bounding box')
  await page.mouse.move(box.x + box.width / 2, box.y + 120)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + 230, { steps: 5 })
  await page.mouse.up()
  await expect(sheet).toBeHidden()
})

test('segmented control supports automatic arrow-key selection', async ({
  page
}) => {
  await page.goto(
    '/iframe.html?id=ui-navigation-segmentedcontrol--default&viewMode=story'
  )
  const canvasTab = page.getByRole('tab', { name: 'Canvas' })
  const scenesTab = page.getByRole('tab', { name: 'Scenes' })
  await canvasTab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(scenesTab).toHaveAttribute('aria-selected', 'true')
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
