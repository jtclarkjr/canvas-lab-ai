<script lang="ts">
  import { Maximize2 } from 'lucide-svelte'
  import { tick } from 'svelte'

  type PanelSide = 'left' | 'right'
  type HeaderRenderProps = {
    minimize: () => void | Promise<void>
    animating: boolean
  }
  type PanelDragState = {
    pointerId: number
    startClientY: number
    originTop: number
    started: boolean
    launcher: boolean
  }

  const PANEL_DEFAULT_TOP = 80
  const PANEL_DEFAULT_BOTTOM = 156
  const PANEL_MIN_TOP = 16
  const PANEL_MIN_BOTTOM = 24
  const PANEL_MIN_HEIGHT = 260
  const PANEL_LAUNCHER_HEIGHT = 44
  const PANEL_DRAG_THRESHOLD_PX = 4

  let {
    side,
    panelWidth,
    fullscreen = false,
    ariaLabel,
    openLabel,
    launcher,
    header,
    children
  } = $props<{
    side: PanelSide
    panelWidth: number
    fullscreen?: boolean
    ariaLabel: string
    openLabel: string
    launcher?: () => unknown
    header?: (props: HeaderRenderProps) => unknown
    children?: () => unknown
  }>()

  let minimized = $state(false)
  let animating = $state(false)
  let panelEl = $state<HTMLDivElement | null>(null)
  let launcherEl = $state<HTMLButtonElement | null>(null)
  let activeAnimation: Animation | null = null
  let viewportHeight = $state(900)
  let panelTop = $state(PANEL_DEFAULT_TOP)
  let panelDrag = $state<PanelDragState | null>(null)
  let suppressLauncherClick = false

  const panelZIndexClass = $derived(fullscreen ? 'z-50' : 'z-30')
  const panelSideClass = $derived(side === 'left' ? 'left-4' : 'right-4')
  const launcherSideClass = $derived(side === 'left' ? 'left-3' : 'right-3')
  const openPanelHeight = $derived(
    Math.min(
      Math.max(
        PANEL_MIN_HEIGHT,
        viewportHeight - PANEL_DEFAULT_TOP - PANEL_DEFAULT_BOTTOM
      ),
      Math.max(
        PANEL_MIN_HEIGHT,
        viewportHeight - PANEL_MIN_TOP - PANEL_MIN_BOTTOM
      )
    )
  )
  const clampedPanelTop = $derived(clampPanelTop(panelTop))
  const panelStyle = $derived(
    `top:${clampedPanelTop}px;height:${openPanelHeight}px;width:${panelWidth}px;touch-action:none`
  )
  const launcherStyle = $derived(
    `top:${launcherTopForPanelTop(clampedPanelTop)}px;touch-action:none`
  )

  $effect(() => {
    if (typeof window === 'undefined') return

    const updateViewportHeight = () => {
      viewportHeight = window.innerHeight
    }

    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)
    return () => window.removeEventListener('resize', updateViewportHeight)
  })

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
  }

  function clampPanelTop(top: number) {
    return clamp(
      top,
      PANEL_MIN_TOP,
      Math.max(
        PANEL_MIN_TOP,
        viewportHeight - PANEL_MIN_BOTTOM - openPanelHeight
      )
    )
  }

  function launcherTopForPanelTop(top: number) {
    return clamp(
      top + openPanelHeight / 2 - PANEL_LAUNCHER_HEIGHT / 2,
      PANEL_MIN_TOP,
      Math.max(
        PANEL_MIN_TOP,
        viewportHeight - PANEL_MIN_BOTTOM - PANEL_LAUNCHER_HEIGHT
      )
    )
  }

  function flipTransform(from: DOMRect, to: DOMRect) {
    const scaleX = from.width / to.width
    const scaleY = from.height / to.height
    return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scaleX}, ${scaleY})`
  }

  function handleDragPointerDown(event: PointerEvent, launcherDrag = false) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (
      !launcherDrag &&
      (event.target as Element).closest('button,a,input,textarea,select')
    ) {
      return
    }

    event.stopPropagation()
    event.preventDefault()
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    panelDrag = {
      pointerId: event.pointerId,
      startClientY: event.clientY,
      originTop: clampedPanelTop,
      started: false,
      launcher: launcherDrag
    }
  }

  function handleDragPointerMove(event: PointerEvent) {
    if (!panelDrag) return
    event.stopPropagation()
    event.preventDefault()

    const dy = event.clientY - panelDrag.startClientY
    if (!panelDrag.started) {
      if (Math.abs(dy) < PANEL_DRAG_THRESHOLD_PX) return
      panelDrag.started = true
    }

    panelTop = clampPanelTop(panelDrag.originTop + dy)
  }

  function handleDragPointerUp(event: PointerEvent) {
    if (!panelDrag) return
    event.stopPropagation()

    const element = event.currentTarget as HTMLElement
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId)
    }

    if (panelDrag.launcher) {
      suppressLauncherClick = true
      if (!panelDrag.started) {
        void restore()
      }
    }
    panelDrag = null
  }

  function handleDragPointerCancel(event: PointerEvent) {
    if (!panelDrag) return
    event.stopPropagation()
    panelDrag = null
  }

  function handleLauncherClick(event: MouseEvent) {
    if (suppressLauncherClick) {
      suppressLauncherClick = false
      event.preventDefault()
      return
    }
    void restore()
  }

  async function minimize() {
    if (animating) return
    animating = true
    activeAnimation?.cancel()

    const panel = panelEl
    const launcherButton = launcherEl
    if (panel && launcherButton) {
      panel.style.transformOrigin = 'top left'
      const target = panel.getBoundingClientRect()
      const origin = launcherButton.getBoundingClientRect()
      activeAnimation = panel.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: flipTransform(origin, target), opacity: 0.15 }
        ],
        {
          duration: 240,
          easing: 'cubic-bezier(0.55, 0, 0.55, 0.2)',
          fill: 'forwards'
        }
      )
      await activeAnimation.finished.catch(() => undefined)
    }

    minimized = true
    animating = false
  }

  async function restore() {
    if (animating) return
    animating = true
    const origin = launcherEl?.getBoundingClientRect()

    minimized = false
    await tick()
    activeAnimation?.cancel()

    const panel = panelEl
    if (panel && origin) {
      panel.style.transformOrigin = 'top left'
      const target = panel.getBoundingClientRect()
      activeAnimation = panel.animate(
        [
          { transform: flipTransform(origin, target), opacity: 0.4 },
          { transform: 'none', opacity: 1 }
        ],
        { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      )
      await activeAnimation.finished.catch(() => undefined)
    }

    animating = false
  }
</script>

<button
  bind:this={launcherEl}
  type="button"
  class={`fixed ${launcherSideClass} ${panelZIndexClass} flex h-11 w-14 cursor-grab touch-none items-center justify-center gap-1 rounded-full border border-border/80 bg-card/95 text-foreground shadow-xl backdrop-blur transition hover:bg-card active:cursor-grabbing ${
    minimized
      ? 'pointer-events-auto opacity-100'
      : 'pointer-events-none opacity-0'
  }`}
  style={launcherStyle}
  onclick={handleLauncherClick}
  onpointerdown={(event) => handleDragPointerDown(event, true)}
  onpointermove={handleDragPointerMove}
  onpointerup={handleDragPointerUp}
  onpointercancel={handleDragPointerCancel}
  aria-label={`Open ${openLabel}`}
  aria-hidden={!minimized}
  tabindex={minimized ? 0 : -1}
  title={`Open ${openLabel}`}
>
  {@render launcher?.()}
  <Maximize2 class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  <span class="sr-only">{openLabel}</span>
</button>

{#if !minimized}
  <div
    bind:this={panelEl}
    class={`pointer-events-auto fixed ${panelSideClass} ${panelZIndexClass} flex flex-col overflow-visible rounded-lg border border-border/80 bg-card/95 shadow-xl backdrop-blur`}
    style={panelStyle}
    role="dialog"
    aria-label={ariaLabel}
    tabindex="-1"
    onpointerdown={(event) => event.stopPropagation()}
    onkeydown={(event) => event.stopPropagation()}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex cursor-grab touch-none select-none items-center border-b border-border/70 active:cursor-grabbing"
      onpointerdown={(event) => handleDragPointerDown(event)}
      onpointermove={handleDragPointerMove}
      onpointerup={handleDragPointerUp}
      onpointercancel={handleDragPointerCancel}
    >
      {@render header?.({ minimize, animating })}
    </div>

    {@render children?.()}
  </div>
{/if}
