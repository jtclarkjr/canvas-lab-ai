import { describe, expect, it } from 'vite-plus/test'
import {
  calculateTextBounds,
  canvasToScreen,
  findTextHandleAtPoint,
  findTextAtPoint,
  getTextEditorWidth,
  getTextCenter,
  getTextLineBaseline,
  getTextLineHeight,
  getTextLines,
  getTextLineTop,
  getTextResizeCursor,
  getTextResizeHandles,
  getTextRotateHandle,
  isElementInSelection,
  isPointNearPath,
  resizeTextFromHandle,
  rotateTextTowardPoint,
  screenToCanvas
} from '#lib/canvas/drawing-utils.js'
import type { Path, TextElement } from '#lib/canvas/types.js'

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

    expect(findTextAtPoint({ x: 15, y: secondLineY }, [text])?.id).toBe(
      'text-1'
    )
    expect(
      findTextAtPoint({ x: 15, y: 20 + 3 * getTextLineHeight(18) + 30 }, [text])
    ).toBeNull()
  })

  it('hit-tests and transforms selected text handles', () => {
    const text = makeText({ rotation: 15 })
    const center = getTextCenter(text)
    const resizeHandle = getTextResizeHandles(text)[2]
    const rotateHandle = getTextRotateHandle(text)

    expect(findTextAtPoint(center, [text])?.id).toBe('text-1')
    expect(
      findTextHandleAtPoint(
        resizeHandle?.point ?? center,
        [text],
        new Set([text.id]),
        1
      )?.type
    ).toBe('resize')
    expect(
      findTextHandleAtPoint(rotateHandle, [text], new Set([text.id]), 1)?.type
    ).toBe('rotate')

    const resized = resizeTextFromHandle(text, 'se', {
      x: resizeHandle?.point.x ?? center.x,
      y: (resizeHandle?.point.y ?? center.y) + 40
    })
    const rotated = rotateTextTowardPoint(text, {
      x: center.x,
      y: center.y - 80
    })

    expect(resized.fontSize).toBeGreaterThan(text.fontSize)
    expect(resized.rotation).toBe(text.rotation)
    expect(Math.round(rotated.rotation ?? 0)).toBe(0)
    expect(getTextResizeCursor('nw', 45)).toBe('ns-resize')
  })

  it('calculates single-line text bounds from the top-left anchor', () => {
    const text = makeText({ fontSize: 20 })
    const bounds = calculateTextBounds(text)

    expect(bounds).toEqual({
      x: 6,
      y: 16,
      width: 'hello'.length * 20 * 0.6 + 8,
      height: 20 + 8
    })
  })

  it('calculates multiline text bounds from the longest line', () => {
    const text = makeText({ text: 'a\nlonger line', fontSize: 16 })
    const bounds = calculateTextBounds(text)

    expect(bounds.width).toBe('longer line'.length * 16 * 0.6 + 8)
    expect(bounds.height).toBe(getTextLineHeight(16) + 16 + 8)
  })

  it('uses shared line and editor width layout helpers', () => {
    const text = makeText({ text: 'short\nlonger', fontSize: 16 })
    const lines = getTextLines(text.text)

    expect(lines).toEqual(['short', 'longer'])
    expect(getTextLineTop(text, 0)).toBe(20)
    expect(getTextLineTop(text, 1)).toBe(20 + getTextLineHeight(16))
    expect(getTextLineBaseline(text, 0)).toBe(36)
    expect(getTextLineBaseline(text, 1)).toBe(36 + getTextLineHeight(16))
    expect(getTextEditorWidth(lines, 16, 2)).toBe(
      Math.max(120, 'longer'.length * 16 * 0.6 * 2 + 16)
    )
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

    expect(isElementInSelection(path, { x1: 0, y1: 0, x2: 15, y2: 15 })).toBe(
      true
    )
    expect(isElementInSelection(path, { x1: 30, y1: 30, x2: 40, y2: 40 })).toBe(
      false
    )
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

  it('keeps canvas and screen coordinates inverse-compatible with camera transforms', () => {
    const camera = { x: 50, y: 30, scale: 2 }
    const svgRect = { left: 10, top: 20 } as DOMRect
    const canvasPoint = screenToCanvas(160, 120, svgRect, camera)

    expect(canvasPoint).toEqual({ x: 50, y: 35 })
    expect(canvasToScreen(canvasPoint, camera)).toEqual({ x: 150, y: 100 })
  })
})
