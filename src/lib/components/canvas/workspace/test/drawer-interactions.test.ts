// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { mount, tick, unmount } from 'svelte'
import CallSessionsDrawer from '../CallSessionsDrawer.svelte'
import CanvasHistoryDrawer from '../CanvasHistoryDrawer.svelte'

vi.mock('$lib/auth/session-store', () => ({
  supabase: null
}))

vi.mock('$lib/conference/api', () => ({
  getCallSession: vi.fn(),
  listCallSessions: vi.fn().mockResolvedValue({ items: [] }),
  reconcileCallSession: vi.fn()
}))

vi.mock('$lib/workspace/api', () => ({
  listCanvasHistory: vi.fn().mockResolvedValue({
    items: [],
    nextBefore: null
  })
}))

const nativeAnimate = Object.getOwnPropertyDescriptor(
  Element.prototype,
  'animate'
)

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: mockAnimate
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  document.body.replaceChildren()
  if (nativeAnimate) {
    Object.defineProperty(Element.prototype, 'animate', nativeAnimate)
  } else {
    Reflect.deleteProperty(Element.prototype, 'animate')
  }
})

describe('workspace drawer interactions', () => {
  it('keeps call sessions open for inside clicks and dismisses from the backdrop', async () => {
    vi.useFakeTimers()
    const drawer = mount(CallSessionsDrawer, {
      target: document.body,
      props: { canvasId: 'canvas-1', open: true }
    })

    try {
      await finishIntro()

      const panel = getPanel('Call sessions')
      panel.click()
      await tick()

      expect(getPanel('Call sessions')).toBe(panel)

      getBackdrop().click()
      await tick()

      expect(document.body.contains(panel)).toBe(true)

      await finishOutro()

      expect(queryPanel('Call sessions')).toBeNull()
      expect(document.querySelector('[data-drawer-backdrop]')).toBeNull()
    } finally {
      void unmount(drawer)
    }
  })

  it('keeps canvas history open for inside clicks and dismisses from the backdrop', async () => {
    vi.useFakeTimers()
    const drawer = mount(CanvasHistoryDrawer, {
      target: document.body,
      props: { canvasId: 'canvas-1', open: true }
    })

    try {
      await finishIntro()

      const panel = getPanel('Canvas history')
      panel.click()
      await tick()

      expect(getPanel('Canvas history')).toBe(panel)

      getBackdrop().click()
      await tick()

      expect(document.body.contains(panel)).toBe(true)

      await finishOutro()

      expect(queryPanel('Canvas history')).toBeNull()
      expect(document.querySelector('[data-drawer-backdrop]')).toBeNull()
    } finally {
      void unmount(drawer)
    }
  })
})

async function finishIntro() {
  await tick()
  await vi.advanceTimersByTimeAsync(200)
  await tick()
}

async function finishOutro() {
  await vi.advanceTimersByTimeAsync(200)
  await tick()
}

function getPanel(label: string) {
  const panel = queryPanel(label)
  expect(panel).not.toBeNull()
  return panel as HTMLElement
}

function queryPanel(label: string) {
  return document.querySelector<HTMLElement>(
    `[role="dialog"][aria-label="${label}"]`
  )
}

function getBackdrop() {
  const backdrop = document.querySelector<HTMLButtonElement>(
    '[data-drawer-backdrop]'
  )
  expect(backdrop).not.toBeNull()
  return backdrop as HTMLButtonElement
}

function mockAnimate(
  _keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
  options?: number | KeyframeAnimationOptions
) {
  const duration =
    typeof options === 'number' ? options : Number(options?.duration ?? 0)
  let timer: ReturnType<typeof setTimeout>
  const state = {
    currentTime: 0,
    effect: {} as AnimationEffect | null,
    onfinish: null as Animation['onfinish'],
    playState: 'running',
    cancel() {
      clearTimeout(timer)
      state.playState = 'idle'
    }
  }
  const animation = state as unknown as Animation

  timer = setTimeout(() => {
    if (state.playState !== 'running') return
    state.currentTime = duration
    state.playState = 'finished'
    state.onfinish?.call(
      animation,
      new Event('finish') as AnimationPlaybackEvent
    )
  }, duration)

  return animation
}
