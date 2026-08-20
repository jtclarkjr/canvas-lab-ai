<script lang="ts">
  import { Minimize2, Trash2 } from 'lucide-svelte'
  import { cubicOut } from 'svelte/easing'
  import { fade, fly } from 'svelte/transition'
  import type {
    Scene,
    SceneMessage,
    UpdateSceneInput
  } from '$lib/scenes/schema'
  import type { SceneActivity, SceneActivityKind } from '$lib/scenes/types'
  import { getSceneType } from '$lib/scenes/registry'
  import { toast } from '$lib/stores/shared/toast.svelte'
  import type { SceneDocumentsStore } from '$lib/stores/scenes/documents/types'
  import { desktopDeviceProfile } from '$lib/workspace/device-profile.svelte'
  import type { WorkspaceDeviceProfile } from '$lib/workspace/device-profile/types'
  import { ConfirmDialog } from '$lib/components/shared/feedback'
  import MobileDocumentScenePanel from '$lib/mobile/components/scenes/MobileDocumentScenePanel.svelte'
  import MobileSceneEntry, {
    type MobileSceneEntryStart
  } from '$lib/mobile/components/scenes/MobileSceneEntry.svelte'

  let {
    canvasId,
    scene,
    userId,
    originRect,
    canModify,
    sceneDocumentsStore,
    documentRevision,
    liveMessages,
    remoteActivity,
    remoteStreamingText,
    deviceProfile = desktopDeviceProfile,
    onClose,
    onPatchScene,
    onDeleteScene,
    onBroadcastActivity
  } = $props<{
    canvasId: string
    scene: Scene
    userId: string
    originRect: DOMRect | null
    canModify: boolean
    sceneDocumentsStore: SceneDocumentsStore
    documentRevision: number
    liveMessages: SceneMessage[]
    remoteActivity: SceneActivity | null
    remoteStreamingText: string
    deviceProfile?: WorkspaceDeviceProfile
    onClose: () => void
    onPatchScene: (patch: UpdateSceneInput) => Promise<void>
    onDeleteScene: () => void
    onBroadcastActivity: (kind: SceneActivityKind, textDelta?: string) => void
  }>()

  let dialogEl = $state<HTMLDivElement | null>(null)
  let backdropEl = $state<HTMLDivElement | null>(null)
  let isClosing = false
  let initialPrompt = $state<string | null>(null)
  let confirmDeleteOpen = $state(false)
  let dragPointerId: number | null = null
  let dragStartX = 0
  let dragStartY = 0
  let dragStartScrollable: HTMLElement | null = null
  let dragActive = false
  let dragY = $state(0)
  let dragging = $state(false)

  const sceneType = $derived(getSceneType(scene.type))
  const isPhone = $derived(deviceProfile.shell === 'phone')
  const sheetStyle = $derived(`transform:translateY(${dragY}px)`)
  const hasStarted = $derived(
    typeof scene.settings.category === 'string' &&
      scene.settings.category !== ''
  )

  function flipTransform(from: DOMRect, to: DOMRect) {
    const scaleX = from.width / to.width
    const scaleY = from.height / to.height
    return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scaleX}, ${scaleY})`
  }

  // Move focus into the dialog when it opens.
  $effect(() => {
    if (dialogEl) {
      const firstFocusable = dialogEl.querySelector<HTMLElement>(
        'button,input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    }
  })

  // Expand from the card rect into the dialog rect (FLIP). Without an
  // origin rect (e.g. a freshly created scene) fall back to a centered
  // scale-in.
  $effect(() => {
    const el = dialogEl
    if (!el) return
    if (isPhone) return

    el.style.transformOrigin = 'top left'
    const target = el.getBoundingClientRect()

    if (originRect) {
      el.animate(
        [
          { transform: flipTransform(originRect, target), opacity: 0.4 },
          { transform: 'none', opacity: 1 }
        ],
        { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      )
    } else {
      el.animate(
        [
          { transform: 'scale(0.96)', opacity: 0 },
          { transform: 'none', opacity: 1 }
        ],
        { duration: 200, easing: 'ease-out' }
      )
    }

    backdropEl?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 })
  })

  // Minimize back into the card's *live* rect — the camera may have moved
  // since the dialog opened, so the rect is re-measured at close time.
  async function minimize() {
    if (isClosing) return
    isClosing = true
    dragY = 0

    if (isPhone) {
      onClose()
      return
    }

    const el = dialogEl
    const cardRect =
      document
        .querySelector(`[data-scene-id="${scene.id}"]`)
        ?.getBoundingClientRect() ?? null

    backdropEl?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 220,
      fill: 'forwards'
    })

    if (el && cardRect) {
      const target = el.getBoundingClientRect()
      const animation = el.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: flipTransform(cardRect, target), opacity: 0.15 }
        ],
        {
          duration: 240,
          easing: 'cubic-bezier(0.55, 0, 0.55, 0.2)',
          fill: 'forwards'
        }
      )
      await animation.finished.catch(() => undefined)
    } else if (el) {
      const animation = el.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: 'scale(0.96)', opacity: 0 }
        ],
        { duration: 150, easing: 'ease-in', fill: 'forwards' }
      )
      await animation.finished.catch(() => undefined)
    }

    onClose()
  }

  function closestScrollable(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return null
    }

    let current: HTMLElement | null = target
    while (current) {
      const style = window.getComputedStyle(current)
      const canScroll =
        /(auto|scroll)/.test(style.overflowY) &&
        current.scrollHeight > current.clientHeight

      if (canScroll) {
        return current
      }

      if (current.getAttribute('role') === 'dialog') {
        return null
      }

      current = current.parentElement
    }

    return null
  }

  function handleDragStart(event: PointerEvent) {
    if (!isPhone || isClosing) return
    dragPointerId = event.pointerId
    dragStartX = event.clientX
    dragStartY = event.clientY - dragY
    dragStartScrollable = closestScrollable(event.target)
    dragActive = false
    dragging = false
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function handleDragMove(event: PointerEvent) {
    if (!isPhone || event.pointerId !== dragPointerId) return

    const deltaX = event.clientX - dragStartX
    const deltaY = event.clientY - dragStartY

    if (!dragActive) {
      if (
        deltaY <= 10 ||
        Math.abs(deltaX) > Math.abs(deltaY) ||
        (dragStartScrollable && dragStartScrollable.scrollTop > 0)
      ) {
        return
      }

      dragActive = true
      dragging = true
    }

    event.preventDefault()
    dragY = Math.max(0, deltaY)
  }

  function handleDragEnd(event: PointerEvent) {
    if (!isPhone || event.pointerId !== dragPointerId) return
    dragging = false
    dragActive = false
    dragStartScrollable = null
    dragPointerId = null

    if (dragY > 80) {
      void minimize()
      return
    }

    dragY = 0
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      // The confirm dialog owns Escape while it is open.
      if (confirmDeleteOpen) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      void minimize()
    }
  }

  async function handleStart(start: MobileSceneEntryStart) {
    initialPrompt = start.prompt
    await onPatchScene({
      type: start.type,
      settings: {
        ...scene.settings,
        category: start.category,
        modelId: start.modelId
      }
    })
  }

  function handleDeleteConfirmed() {
    const deletedTitle = scene.title || sceneType?.defaultTitle || 'Scene'
    onDeleteScene()
    onClose()
    toast.show({ title: 'Scene deleted', description: deletedTitle })
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div
  bind:this={backdropEl}
  class="fixed inset-0 z-40 cursor-auto bg-black/45 backdrop-blur-sm"
  role="presentation"
  data-camera-exempt
  transition:fade={{ duration: 120 }}
  onpointerdown={() => void minimize()}
></div>

<div
  bind:this={dialogEl}
  class={isPhone
    ? `fixed inset-x-0 bottom-0 z-50 flex h-[94dvh] max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] min-h-[20rem] cursor-auto flex-col overflow-hidden rounded-t-2xl border border-border/70 bg-card text-card-foreground shadow-2xl ${
        dragging ? '' : 'transition-transform duration-150'
      }`
    : 'glass-card fixed inset-x-[6vw] inset-y-[5vh] z-50 flex cursor-auto flex-col overflow-hidden md:inset-x-[10vw]'}
  style={isPhone ? sheetStyle : undefined}
  role="dialog"
  aria-modal="true"
  aria-labelledby="scene-dialog-title"
  tabindex="-1"
  data-camera-exempt
  transition:fly={isPhone
    ? { y: 36, duration: 180, easing: cubicOut }
    : undefined}
  onpointerdown={handleDragStart}
  onpointermove={handleDragMove}
  onpointerup={handleDragEnd}
  onpointercancel={handleDragEnd}
>
  <header
    class={isPhone
      ? 'shrink-0 border-b border-border/60 px-4 pb-3 pt-2'
      : 'flex items-center justify-between gap-3 border-b border-border/50 px-5 py-3'}
  >
    {#if isPhone}
      <button
        type="button"
        class="mx-auto mb-3 block h-5 w-16 rounded-full"
        aria-label="Drag down to close scene"
        onclick={() => void minimize()}
      >
        <span class="mx-auto block h-1 w-10 rounded-full bg-muted-foreground/30"
        ></span>
      </button>
    {/if}

    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <span
          class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground"
        >
          {sceneType?.label ?? scene.type}
        </span>
        <h2
          id="scene-dialog-title"
          class="truncate text-sm font-semibold text-foreground"
        >
          {scene.title || sceneType?.defaultTitle || 'Scene'}
        </h2>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        {#if canModify}
          <button
            type="button"
            class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            onclick={() => (confirmDeleteOpen = true)}
            aria-label="Delete scene"
          >
            <Trash2 class="size-4" aria-hidden="true" />
          </button>
        {/if}
        {#if !isPhone}
          <button
            type="button"
            class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onclick={() => void minimize()}
            aria-label="Minimize scene"
          >
            <Minimize2 class="size-4" aria-hidden="true" />
          </button>
        {/if}
      </div>
    </div>
  </header>

  <div class="min-h-0 flex-1">
    {#if !hasStarted}
      <MobileSceneEntry readOnly={!canModify} onStart={handleStart} />
    {:else}
      <MobileDocumentScenePanel
        {canvasId}
        {scene}
        {userId}
        {canModify}
        {sceneDocumentsStore}
        {documentRevision}
        {liveMessages}
        {remoteActivity}
        {remoteStreamingText}
        {initialPrompt}
        onInitialPromptSent={() => (initialPrompt = null)}
        {onBroadcastActivity}
      />
    {/if}
  </div>
</div>

<ConfirmDialog
  bind:open={confirmDeleteOpen}
  title="Delete scene?"
  message={`“${scene.title || sceneType?.defaultTitle || 'This scene'}” and its documents and chat history will be permanently deleted.`}
  confirmLabel="Delete scene"
  onConfirm={handleDeleteConfirmed}
/>
