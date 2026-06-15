<script lang="ts">
  import {
    LoaderCircle,
    Maximize2,
    Mic,
    MicOff,
    Minus,
    PhoneOff,
    PictureInPicture2,
    Settings,
    Video,
    VideoOff,
    Volume2
  } from 'lucide-svelte'
  import {
    anchorFor,
    clampToViewport,
    nearestCorner
  } from '$lib/conference/helpers'
  import type { Point } from '$lib/canvas/types'
  import type { Size } from '$lib/conference/types'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'
  import ConferenceParticipantStrip from '$lib/components/canvas/conference/tiles/ConferenceParticipantStrip.svelte'
  import { attachTrack } from '$lib/components/canvas/conference/media-actions'

  const store = useCanvasConferenceStore()

  // Video card matches the chat window's 24rem width at 16:9; the bar mode
  // collapses to a speaker pill. The participant strip overlays outside the
  // box, so drag/snap math only tracks the card itself.
  const MAX_PIP_WIDTH = 384
  const MIN_PIP_WIDTH = 240
  // Width below which a resize-release snaps to bar mode
  const SNAP_ZONE_WIDTH = 180
  const BAR_SIZE: Size = { width: 360, height: 56 }

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let pipWidth = $state(MAX_PIP_WIDTH)
  const pipHeight = $derived(Math.round(pipWidth * (9 / 16)))

  const boxSize = $derived(
    store.viewMode === 'bar' ? BAR_SIZE : { width: pipWidth, height: pipHeight }
  )

  // Resize state
  let resizing = $state(false)
  let resizePointerId: number | null = null
  let resizeStartX = 0
  let resizeStartWidth = 0

  function onResizePointerDown(event: PointerEvent) {
    event.stopPropagation()
    event.preventDefault()
    resizePointerId = event.pointerId
    resizeStartX = event.clientX
    resizeStartWidth = pipWidth
    resizing = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onResizePointerMove(event: PointerEvent) {
    if (!resizing || event.pointerId !== resizePointerId) return
    const delta = event.clientX - resizeStartX
    pipWidth = Math.max(
      SNAP_ZONE_WIDTH,
      Math.min(MAX_PIP_WIDTH, resizeStartWidth + delta)
    )
  }

  function onResizePointerUp(event: PointerEvent) {
    if (!resizing || event.pointerId !== resizePointerId) return
    resizing = false
    resizePointerId = null
    if (pipWidth < MIN_PIP_WIDTH) {
      pipWidth = MAX_PIP_WIDTH
      store.setViewMode('bar')
    } else {
      moveTo(anchorFor(store.corner, boxSize, viewport, store.chatOpen))
    }
  }

  let boxEl = $state<HTMLDivElement | null>(null)
  let contentEl = $state<HTMLDivElement | null>(null)
  let renderedMode = $state(store.viewMode)
  let modeAnim: Animation | null = null

  const contentOrigin = $derived(
    store.corner.startsWith('bottom') ? 'bottom center' : 'top center'
  )

  $effect(() => {
    const targetMode = store.viewMode
    const currentMode = renderedMode
    if (targetMode === currentMode) return

    const el = contentEl
    if (!el || reducedMotion) {
      renderedMode = targetMode
      return
    }

    modeAnim?.cancel()
    el.style.transformOrigin = contentOrigin
    modeAnim = el.animate(
      [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.92)' }
      ],
      { duration: 130, easing: 'ease-in', fill: 'forwards' }
    )
    modeAnim.finished
      .then(() => {
        renderedMode = targetMode
        queueMicrotask(() => {
          if (!contentEl) return
          // Cancel the exit animation to clear its fill:forwards before entering
          modeAnim?.cancel()
          contentEl.style.transformOrigin = contentOrigin
          modeAnim = contentEl.animate(
            [
              { opacity: 0, transform: 'scale(0.92)' },
              { opacity: 1, transform: 'scale(1)' }
            ],
            { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
          )
        })
      })
      .catch(() => undefined)
  })

  let viewport = $state<Size>({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight
  })
  // svelte-ignore state_referenced_locally -- intentionally the initial
  // value: the re-anchor effect below keeps pos in sync from here on.
  let pos = $state<Point>(
    anchorFor(store.corner, boxSize, viewport, store.chatOpen)
  )
  let dragging = $state(false)

  let dragPointerId: number | null = null
  let grabOffset: Point = { x: 0, y: 0 }
  let dragStart: Point = { x: 0, y: 0 }
  let movedBeyondClick = false

  function moveTo(target: Point) {
    const el = boxEl
    const from = pos
    pos = target
    if (!el || reducedMotion || (from.x === target.x && from.y === target.y)) {
      return
    }
    // Same snappy curve as the chat window FLIP.
    el.animate(
      [
        { transform: `translate3d(${from.x}px, ${from.y}px, 0)` },
        { transform: `translate3d(${target.x}px, ${target.y}px, 0)` }
      ],
      { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    )
  }

  // Glide to the active corner anchor whenever the environment shifts under
  // a resting box: chat opening/closing, window resizes, corner changes,
  // pip/bar mode switches.
  $effect(() => {
    const target = anchorFor(store.corner, boxSize, viewport, store.chatOpen)
    if (dragging || resizing) {
      return
    }
    if (target.x !== pos.x || target.y !== pos.y) {
      moveTo(target)
    }
  })

  $effect(() => {
    const onResize = () => {
      viewport = { width: window.innerWidth, height: window.innerHeight }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  })

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) {
      return
    }
    if ((event.target as HTMLElement).closest('button, select, a')) {
      return
    }
    dragPointerId = event.pointerId
    grabOffset = { x: event.clientX - pos.x, y: event.clientY - pos.y }
    dragStart = { x: event.clientX, y: event.clientY }
    movedBeyondClick = false
    dragging = true
    boxEl?.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging || event.pointerId !== dragPointerId) {
      return
    }
    if (
      Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 4
    ) {
      movedBeyondClick = true
    }
    pos = clampToViewport(
      { x: event.clientX - grabOffset.x, y: event.clientY - grabOffset.y },
      boxSize,
      viewport
    )
  }

  function onPointerUp(event: PointerEvent) {
    if (!dragging || event.pointerId !== dragPointerId) {
      return
    }
    dragging = false
    dragPointerId = null
    if (!movedBeyondClick) {
      // A click settles back onto the current anchor without re-snapping.
      moveTo(anchorFor(store.corner, boxSize, viewport, store.chatOpen))
      return
    }
    const corner = nearestCorner(
      { x: pos.x + boxSize.width / 2, y: pos.y + boxSize.height / 2 },
      viewport
    )
    store.setCorner(corner)
    moveTo(anchorFor(corner, boxSize, viewport, store.chatOpen))
  }

  const stripPlacement = $derived(
    store.corner.startsWith('top') ? 'below' : 'above'
  )
  const featured = $derived(store.featured)
  const showFeaturedVideo = $derived(
    featured !== null && featured.videoTrack !== null && featured.camEnabled
  )
</script>

<div
  bind:this={boxEl}
  class={`group fixed left-0 top-0 z-[45] touch-none select-none ${
    resizing ? 'cursor-se-resize' : dragging ? 'cursor-grabbing' : 'cursor-grab'
  }`}
  style:width={`${boxSize.width}px`}
  style:transform={`translate3d(${pos.x}px, ${pos.y}px, 0)`}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  role="region"
  aria-label="Video call"
  data-camera-exempt
>
  <div bind:this={contentEl}>
    {#if renderedMode === 'bar'}
      <!-- Minimized: a speaker pill, controls always visible. -->
      <div
        class="flex h-14 items-center gap-2 rounded-full border border-border/30 bg-card/30 pl-2 pr-2 backdrop-blur-md"
      >
        {#if featured}
          <span
            class={`flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-inner transition ${
              featured.isSpeaking ? 'ring-2 ring-success' : ''
            }`}
            style={`background-color:${featured.color};color:var(--canvas-avatar-foreground)`}
          >
            {featured.name.trim().slice(0, 2).toUpperCase() || 'ME'}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-semibold text-foreground">
              {featured.isLocal ? 'You' : featured.name}
            </p>
            <p class="text-[10px] text-muted-foreground">
              {store.participants.length} in call
            </p>
          </div>
        {/if}

        <button
          type="button"
          class={`flex size-8 shrink-0 items-center justify-center rounded-full transition ${
            store.micEnabled
              ? 'text-foreground hover:bg-muted'
              : 'bg-destructive text-destructive-foreground'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          onclick={() => void store.toggleMic()}
          disabled={!store.hasMic}
          title={!store.hasMic
            ? 'No microphone found'
            : store.micEnabled
              ? 'Mute microphone'
              : 'Unmute microphone'}
          aria-label={store.micEnabled
            ? 'Mute microphone'
            : 'Unmute microphone'}
        >
          {#if store.micEnabled}
            <Mic class="size-4" />
          {:else}
            <MicOff class="size-4" />
          {/if}
        </button>
        <button
          type="button"
          class="flex size-8 shrink-0 items-center justify-center rounded-full text-foreground transition hover:bg-muted"
          onclick={() => store.setViewMode('pip')}
          title="Show video"
          aria-label="Show video"
        >
          <PictureInPicture2 class="size-4" />
        </button>
        <button
          type="button"
          class="flex size-8 shrink-0 items-center justify-center rounded-full text-foreground transition hover:bg-muted"
          onclick={() => store.setViewMode('fullscreen')}
          title="Full screen"
          aria-label="Full screen"
        >
          <Maximize2 class="size-4" />
        </button>
        <button
          type="button"
          class="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition hover:opacity-90"
          onclick={() => void store.leave()}
          title="Leave call"
          aria-label="Leave call"
        >
          <PhoneOff class="size-4" />
        </button>
      </div>
    {:else}
      <ConferenceParticipantStrip placement={stripPlacement} />

      <div
        class="glass-card relative aspect-video overflow-hidden rounded-3xl border border-border/70"
      >
        {#if showFeaturedVideo && featured}
          {#key featured.identity}
            <video
              use:attachTrack={featured.videoTrack}
              autoplay
              playsinline
              muted
              class={`h-full w-full object-cover ${featured.isLocal ? '-scale-x-100' : ''}`}
            ></video>
          {/key}
        {:else}
          <div
            class="flex h-full w-full items-center justify-center bg-secondary/60"
          >
            {#if featured}
              <span
                class="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold shadow-inner"
                style={`background-color:${featured.color};color:var(--canvas-avatar-foreground)`}
              >
                {featured.name.trim().slice(0, 2).toUpperCase() || 'ME'}
              </span>
            {/if}
          </div>
        {/if}

        {#if featured}
          <span
            class="absolute bottom-2 left-2 max-w-[60%] truncate rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur"
          >
            {featured.isLocal ? 'You' : featured.name}
          </span>
        {/if}

        {#if store.participants.length > 1}
          <span
            class="absolute left-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur"
          >
            {store.participants.length}
          </span>
        {/if}

        {#if !store.canPlayAudio}
          <button
            type="button"
            class="absolute left-1/2 top-2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-warning px-2.5 py-1 text-[11px] font-bold text-warning-foreground shadow"
            onclick={() => void store.startAudio()}
          >
            <Volume2 class="size-3.5" />
            Tap to unmute call
          </button>
        {/if}

        <div
          class="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60"
            onclick={() => store.setViewMode('bar')}
            title="Minimize to bar"
            aria-label="Minimize to bar"
          >
            <Minus class="size-3.5" />
          </button>
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60"
            onclick={() => store.setViewMode('fullscreen')}
            title="Full screen"
            aria-label="Full screen"
          >
            <Maximize2 class="size-3.5" />
          </button>
        </div>

        {#if store.status === 'connecting' || store.status === 'reconnecting'}
          <div
            class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 text-white backdrop-blur-sm"
          >
            <LoaderCircle class="size-5 animate-spin" />
            <span class="text-xs font-semibold">
              {store.status === 'connecting' ? 'Joining…' : 'Reconnecting…'}
            </span>
          </div>
        {/if}

        <!-- Resize handle: drag to resize PIP, release below min snaps to bar -->
        <div
          class={`absolute bottom-0 right-0 z-10 flex h-6 w-6 cursor-se-resize items-end justify-end p-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 ${pipWidth < MIN_PIP_WIDTH ? 'opacity-100' : ''}`}
          onpointerdown={onResizePointerDown}
          onpointermove={onResizePointerMove}
          onpointerup={onResizePointerUp}
          onpointercancel={onResizePointerUp}
          role="presentation"
          aria-hidden="true"
          title="Drag to resize"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            class={pipWidth < MIN_PIP_WIDTH ? 'text-warning' : 'text-white/70'}
          >
            <path
              d="M1 7L7 1M4 7L7 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </div>

        <div
          class="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 bg-gradient-to-t from-black/55 to-transparent p-2 pt-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <button
            type="button"
            class={`flex size-9 items-center justify-center rounded-full backdrop-blur transition ${
              store.micEnabled
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-destructive text-destructive-foreground'
            } disabled:cursor-not-allowed disabled:opacity-50`}
            onclick={() => void store.toggleMic()}
            disabled={!store.hasMic}
            title={!store.hasMic
              ? 'No microphone found'
              : store.micEnabled
                ? 'Mute microphone'
                : 'Unmute microphone'}
            aria-label={store.micEnabled
              ? 'Mute microphone'
              : 'Unmute microphone'}
            aria-pressed={store.micEnabled}
          >
            {#if store.micEnabled}
              <Mic class="size-4" />
            {:else}
              <MicOff class="size-4" />
            {/if}
          </button>

          <button
            type="button"
            class={`flex size-9 items-center justify-center rounded-full backdrop-blur transition ${
              store.camEnabled
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-destructive text-destructive-foreground'
            } disabled:cursor-not-allowed disabled:opacity-50`}
            onclick={() => void store.toggleCam()}
            disabled={!store.hasCamera}
            title={!store.hasCamera
              ? 'No camera found'
              : store.camEnabled
                ? 'Turn camera off'
                : 'Turn camera on'}
            aria-label={store.camEnabled ? 'Turn camera off' : 'Turn camera on'}
            aria-pressed={store.camEnabled}
          >
            {#if store.camEnabled}
              <Video class="size-4" />
            {:else}
              <VideoOff class="size-4" />
            {/if}
          </button>

          <button
            type="button"
            class="flex size-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30"
            onclick={() => store.setSettingsOpen(true)}
            title="Call settings"
            aria-label="Call settings"
          >
            <Settings class="size-4" />
          </button>

          <button
            type="button"
            class="flex size-9 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition hover:opacity-90"
            onclick={() => void store.leave()}
            title="Leave call"
            aria-label="Leave call"
          >
            <PhoneOff class="size-4" />
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
