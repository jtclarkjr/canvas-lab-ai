export type WorkspaceShell = 'desktop' | 'tablet' | 'phone'

export type WorkspaceDeviceProfile = {
  shell: WorkspaceShell
  isTouchLike: boolean
  hasFinePointer: boolean
  hasHover: boolean
  viewportWidth: number
  viewportHeight: number
}

const PHONE_MAX_WIDTH = 767
const DESKTOP_MIN_WIDTH = 1180

export const desktopDeviceProfile: WorkspaceDeviceProfile = {
  shell: 'desktop',
  isTouchLike: false,
  hasFinePointer: true,
  hasHover: true,
  viewportWidth: 1280,
  viewportHeight: 800
}

function queryMedia(query: string) {
  return typeof window !== 'undefined' && window.matchMedia(query).matches
}

export function classifyWorkspaceShell(
  viewportWidth: number,
  isTouchLike: boolean,
  hasFinePointer: boolean
): WorkspaceShell {
  if (
    viewportWidth <= PHONE_MAX_WIDTH ||
    (isTouchLike && viewportWidth < 820)
  ) {
    return 'phone'
  }

  if (viewportWidth < DESKTOP_MIN_WIDTH || (isTouchLike && !hasFinePointer)) {
    return 'tablet'
  }

  return 'desktop'
}

export function createWorkspaceDeviceProfile() {
  let viewportWidth = $state(desktopDeviceProfile.viewportWidth)
  let viewportHeight = $state(desktopDeviceProfile.viewportHeight)
  let isTouchLike = $state(desktopDeviceProfile.isTouchLike)
  let hasFinePointer = $state(desktopDeviceProfile.hasFinePointer)
  let hasHover = $state(desktopDeviceProfile.hasHover)

  function update() {
    if (typeof window === 'undefined') {
      return
    }

    viewportWidth = window.innerWidth
    viewportHeight = Math.round(
      window.visualViewport?.height ?? window.innerHeight
    )
    isTouchLike =
      queryMedia('(pointer: coarse)') ||
      queryMedia('(any-pointer: coarse)') ||
      navigator.maxTouchPoints > 0
    hasFinePointer = queryMedia('(pointer: fine)')
    hasHover = queryMedia('(hover: hover)')
  }

  function mount() {
    if (typeof window === 'undefined') {
      return
    }

    update()
    const mediaQueries = [
      window.matchMedia('(pointer: coarse)'),
      window.matchMedia('(any-pointer: coarse)'),
      window.matchMedia('(pointer: fine)'),
      window.matchMedia('(hover: hover)')
    ]

    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)
    for (const query of mediaQueries) {
      query.addEventListener('change', update)
    }

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
      for (const query of mediaQueries) {
        query.removeEventListener('change', update)
      }
    }
  }

  return {
    mount,
    get profile(): WorkspaceDeviceProfile {
      return {
        shell: classifyWorkspaceShell(
          viewportWidth,
          isTouchLike,
          hasFinePointer
        ),
        isTouchLike,
        hasFinePointer,
        hasHover,
        viewportWidth,
        viewportHeight
      }
    }
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('classifyWorkspaceShell', () => {
    it('uses the phone shell for narrow viewports', () => {
      expect(classifyWorkspaceShell(390, true, false)).toBe('phone')
      expect(classifyWorkspaceShell(640, false, true)).toBe('phone')
    })

    it('uses the tablet shell for coarse medium viewports', () => {
      expect(classifyWorkspaceShell(1024, true, false)).toBe('tablet')
    })

    it('keeps large fine-pointer viewports on desktop', () => {
      expect(classifyWorkspaceShell(1440, false, true)).toBe('desktop')
    })
  })
}
