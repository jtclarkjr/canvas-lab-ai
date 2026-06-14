import { describe, expect, it } from 'vite-plus/test'
import {
  anchorFor,
  clampToViewport,
  isRenderableVideoTrack,
  nearestCorner,
  pickFeatured,
  PIP_MARGIN,
  PIP_TOP_MARGIN
} from '$lib/conference/helpers'

const viewport = { width: 1280, height: 800 }
const pip = { width: 288, height: 162 }

describe('nearestCorner', () => {
  it('maps each quadrant to its corner', () => {
    expect(nearestCorner({ x: 100, y: 100 }, viewport)).toBe('top-left')
    expect(nearestCorner({ x: 1200, y: 100 }, viewport)).toBe('top-right')
    expect(nearestCorner({ x: 100, y: 700 }, viewport)).toBe('bottom-left')
    expect(nearestCorner({ x: 1200, y: 700 }, viewport)).toBe('bottom-right')
  })
})

describe('anchorFor', () => {
  it('keeps margins on the left corners', () => {
    expect(anchorFor('top-left', pip, viewport, false)).toEqual({
      x: PIP_MARGIN,
      y: PIP_TOP_MARGIN
    })
    expect(anchorFor('bottom-left', pip, viewport, false)).toEqual({
      x: PIP_MARGIN,
      y: viewport.height - pip.height - PIP_MARGIN
    })
  })

  it('clears the top toolbars on the top-right corner', () => {
    expect(anchorFor('top-right', pip, viewport, false)).toEqual({
      x: viewport.width - pip.width - PIP_MARGIN,
      y: PIP_TOP_MARGIN
    })
  })

  it('nudges left of the zoom column in the bottom-right corner', () => {
    const anchor = anchorFor('bottom-right', pip, viewport, false)
    // 24 margin + 40 zoom column + 12 gap from the right edge.
    expect(anchor.x).toBe(viewport.width - pip.width - 76)
    expect(anchor.y).toBe(viewport.height - pip.height - PIP_MARGIN)
  })

  it('sits above the open chat window in the bottom-right corner', () => {
    // Tall enough that chat (560 max) + gap + pip fit without clamping.
    const tall = { width: 1280, height: 1000 }
    const anchor = anchorFor('bottom-right', pip, tall, true)
    // Chat is min(560, vh - 96) tall at bottom-6; the pip rests a gap above
    // it, flush right.
    expect(anchor.x).toBe(tall.width - pip.width - PIP_MARGIN)
    expect(anchor.y).toBe(tall.height - PIP_MARGIN - 560 - 12 - pip.height)
  })

  it('clamps to the top margin when chat plus pip overflow the viewport', () => {
    for (const height of [500, 800]) {
      const anchor = anchorFor(
        'bottom-right',
        pip,
        { width: 1280, height },
        true
      )
      expect(anchor.y).toBe(PIP_TOP_MARGIN)
    }
  })
})

describe('clampToViewport', () => {
  it('keeps the box inside the window', () => {
    expect(clampToViewport({ x: -50, y: -50 }, pip, viewport)).toEqual({
      x: 0,
      y: 0
    })
    expect(clampToViewport({ x: 5000, y: 5000 }, pip, viewport)).toEqual({
      x: viewport.width - pip.width,
      y: viewport.height - pip.height
    })
  })
})

describe('isRenderableVideoTrack', () => {
  it('rejects missing tracks', () => {
    expect(isRenderableVideoTrack(null)).toBe(false)
  })

  it('accepts live media tracks', () => {
    expect(
      isRenderableVideoTrack({ mediaStreamTrack: { readyState: 'live' } })
    ).toBe(true)
  })

  it('rejects ended media tracks', () => {
    expect(
      isRenderableVideoTrack({ mediaStreamTrack: { readyState: 'ended' } })
    ).toBe(false)
  })
})

describe('pickFeatured', () => {
  const me = { identity: 'me', isLocal: true }
  const ada = { identity: 'ada', isLocal: false }
  const ben = { identity: 'ben', isLocal: false }

  it('falls back to self when alone or nobody has spoken', () => {
    expect(pickFeatured([me], null, null)).toBe(me)
    expect(pickFeatured([me, ada], null, null)).toBe(me)
  })

  it('features the last active speaker', () => {
    expect(pickFeatured([me, ada, ben], null, 'ada')).toBe(ada)
    expect(pickFeatured([me, ada, ben], null, 'me')).toBe(me)
  })

  it('returns to self when the speaker leaves', () => {
    expect(pickFeatured([me, ben], null, 'ada')).toBe(me)
  })

  it('lets a pin override the speaker', () => {
    expect(pickFeatured([me, ada, ben], 'ben', 'ada')).toBe(ben)
  })

  it('ignores a pin for someone who left', () => {
    expect(pickFeatured([me, ada], 'ben', 'ada')).toBe(ada)
  })

  it('returns null for an empty roster', () => {
    expect(pickFeatured([], null, null)).toBeNull()
  })
})
