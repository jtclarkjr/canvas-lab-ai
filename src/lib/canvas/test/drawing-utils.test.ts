import { describe, expect, it } from 'vite-plus/test'
import {
  calculateTextBounds,
  findTextAtPoint,
  getTextLineHeight,
  isElementInSelection,
  isPointNearPath
} from '$lib/canvas/drawing-utils'
import type { Path, TextElement } from '$lib/canvas/types'

function makeText(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'text-1',
    text: 'hello',
    x: 10,
    y: 20,
    color: '#111111',
    fontSize: 18,
    isBold: false,
    isItalic: false,
    isUnderline: false,
    ...overrides
  }
}

describe('drawing utils', () => {
  it('finds text elements by bounding box hit test', () => {
    const text = makeText()

    expect(findTextAtPoint({ x: 15, y: 25 }, [text])?.id).toBe('text-1')
    expect(findTextAtPoint({ x: 200, y: 200 }, [text])).toBeNull()
  })

  it('finds multiline text elements on lines below the first', () => {
    const text = makeText({ text: 'first\nsecond\nthird' })
    const secondLineY = 20 + getTextLineHeight(18) + 2

    expect(findTextAtPoint({ x: 15, y: secondLineY }, [text])?.id).toBe('text-1')
    expect(findTextAtPoint({ x: 15, y: 20 + 3 * getTextLineHeight(18) + 30 }, [text])).toBeNull()
  })

  it('calculates multiline text bounds from the longest line', () => {
    const text = makeText({ text: 'a\nlonger line', fontSize: 16 })
    const bounds = calculateTextBounds(text)

    expect(bounds.width).toBe('longer line'.length * 16 * 0.6 + 8)
    expect(bounds.height).toBe(getTextLineHeight(16) + 16 + 8)
  })

  it('detects paths inside selection rectangles', () => {
    const path: Path = {
      id: 'path-1',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 }
      ],
      color: '#000000',
      width: 2,
      opacity: 1
    }

    expect(
      isElementInSelection(path, { x1: 0, y1: 0, x2: 15, y2: 15 })
    ).toBe(true)
    expect(
      isElementInSelection(path, { x1: 30, y1: 30, x2: 40, y2: 40 })
    ).toBe(false)
  })

  it('matches points near a path using the threshold', () => {
    const path: Path = {
      id: 'path-1',
      points: [{ x: 50, y: 50 }],
      color: '#000000',
      width: 2,
      opacity: 1
    }

    expect(isPointNearPath({ x: 55, y: 55 }, path, 10)).toBe(true)
    expect(isPointNearPath({ x: 80, y: 80 }, path, 10)).toBe(false)
  })

  it('matches points near the middle of a long straight segment', () => {
    const path: Path = {
      id: 'path-1',
      points: [
        { x: 0, y: 0 },
        { x: 200, y: 0 }
      ],
      color: '#000000',
      width: 2,
      opacity: 1
    }

    expect(isPointNearPath({ x: 100, y: 5 }, path, 10)).toBe(true)
    expect(isPointNearPath({ x: 100, y: 20 }, path, 10)).toBe(false)
    expect(isPointNearPath({ x: -15, y: 0 }, path, 10)).toBe(false)
  })
})
