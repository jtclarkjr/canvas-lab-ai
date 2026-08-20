import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { crossBrowserVisualStoryIds } from './visual-policy'

type StoryIndexEntry = {
  type: 'story' | 'docs'
  id: string
  name: string
  title: string
  tags?: string[]
}

type StoryIndex = {
  entries: Record<string, StoryIndexEntry>
}

const indexPath = path.join(process.cwd(), 'storybook-static/index.json')
const index = JSON.parse(readFileSync(indexPath, 'utf8')) as StoryIndex
const visualStories = Object.values(index.entries)
  .filter((entry) => entry.type === 'story' && entry.tags?.includes('visual'))
  .sort((left, right) =>
    `${left.title}/${left.name}`.localeCompare(`${right.title}/${right.name}`)
  )

if (visualStories.length === 0) {
  throw new Error(`No visual Storybook stories were found in ${indexPath}`)
}

const crossBrowserVisualStoryIdSet = new Set<string>(crossBrowserVisualStoryIds)
const duplicateCrossBrowserStoryIds = crossBrowserVisualStoryIds.filter(
  (storyId, index, storyIds) => storyIds.indexOf(storyId) !== index
)
const visualStoryIds = new Set(visualStories.map((story) => story.id))
const missingCrossBrowserStories = crossBrowserVisualStoryIds.filter(
  (storyId) => !visualStoryIds.has(storyId)
)

if (duplicateCrossBrowserStoryIds.length > 0) {
  throw new Error(
    `Duplicate cross-browser visual stories: ${duplicateCrossBrowserStoryIds.join(', ')}`
  )
}

if (missingCrossBrowserStories.length > 0) {
  throw new Error(
    `Cross-browser visual stories are missing or no longer tagged visual: ${missingCrossBrowserStories.join(', ')}`
  )
}

function isKnownBrowserNoise(message: string) {
  return (
    message ===
      'ResizeObserver loop completed with undelivered notifications.' ||
    message.includes('Cookie “__cf_bm” has been rejected for invalid domain.')
  )
}

for (const story of visualStories) {
  test(
    `${story.title} / ${story.name}`,
    {
      tag: crossBrowserVisualStoryIdSet.has(story.id)
        ? ['@visual', '@cross-browser-visual']
        : '@visual'
    },
    async ({ page }) => {
      const runtimeErrors: string[] = []
      const recordRuntimeError = (message: string) => {
        const isExpectedNetworkFailure =
          story.tags?.includes('expected-console-error') &&
          message.startsWith(
            'Failed to load resource: the server responded with a status of'
          )
        if (!isKnownBrowserNoise(message) && !isExpectedNetworkFailure) {
          runtimeErrors.push(message)
        }
      }

      page.on('pageerror', (error) => recordRuntimeError(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') recordRuntimeError(message.text())
      })

      await page.setViewportSize(
        story.title.startsWith('Mobile/')
          ? { width: 390, height: 844 }
          : { width: 1440, height: 900 }
      )
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story&embed=true`, {
        waitUntil: 'domcontentloaded'
      })

      const root = page.locator('#storybook-root')
      await expect(root).toBeAttached()
      await page.evaluate(() => document.fonts.ready)
      await page.addStyleTag({
        content: `
        *, *::before, *::after {
          animation-delay: 0s !important;
          animation-duration: 0s !important;
          caret-color: transparent !important;
          transition-delay: 0s !important;
          transition-duration: 0s !important;
        }
      `
      })
      await page.waitForTimeout(500)

      await expect(page).toHaveScreenshot(`${story.id}.png`)
      expect(
        runtimeErrors,
        `Browser errors while rendering ${story.id}`
      ).toEqual([])
    }
  )
}
