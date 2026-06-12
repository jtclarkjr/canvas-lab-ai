<script lang="ts">
  import { Minimize2, Trash2 } from 'lucide-svelte'
  import type { Scene, SceneMessage, UpdateSceneInput } from '$lib/scenes/schema'
  import type { SceneActivity, SceneActivityKind } from '$lib/scenes/types'
  import { getSceneType } from '$lib/scenes/registry'
  import { toast } from '$lib/stores/toast.svelte'
  import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte'
  import SceneEntry, { type SceneEntryStart } from '$lib/components/canvas/scenes/SceneEntry.svelte'
  import DocumentScenePanel from '$lib/components/canvas/scenes/document/DocumentScenePanel.svelte'

  let {
    canvasId,
    scene,
    userId,
    originRect,
    canModify,
    documentRevision,
    liveMessages,
    remoteActivity,
    remoteStreamingText,
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
    documentRevision: number
    liveMessages: SceneMessage[]
    remoteActivity: SceneActivity | null
    remoteStreamingText: string
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

  const sceneType = $derived(getSceneType(scene.type))
  const hasStarted = $derived(
    typeof scene.settings.category === 'string' && scene.settings.category !== ''
  )

  function flipTransform(from: DOMRect, to: DOMRect) {
    const scaleX = from.width / to.width
    const scaleY = from.height / to.height
    return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scaleX}, ${scaleY})`
  }

  // Expand from the card rect into the dialog rect (FLIP). Without an
  // origin rect (e.g. a freshly created scene) fall back to a centered
  // scale-in.
  $effect(() => {
    const el = dialogEl
    if (!el) return

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

    const el = dialogEl
    const cardRect =
      document.querySelector(`[data-scene-id="${scene.id}"]`)?.getBoundingClientRect() ?? null

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
        { duration: 240, easing: 'cubic-bezier(0.55, 0, 0.55, 0.2)', fill: 'forwards' }
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

  async function handleStart(start: SceneEntryStart) {
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
  class="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
  role="presentation"
  data-camera-exempt
  onpointerdown={() => void minimize()}
></div>

<div
  bind:this={dialogEl}
  class="glass-card fixed inset-x-[6vw] inset-y-[5vh] z-50 flex flex-col overflow-hidden md:inset-x-[10vw]"
  role="dialog"
  aria-modal="true"
  aria-label={scene.title || sceneType?.defaultTitle || 'Scene'}
  data-camera-exempt
>
  <header class="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-3">
    <div class="flex min-w-0 items-center gap-2">
      <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        {sceneType?.label ?? scene.type}
      </span>
      <h2 class="truncate text-sm font-semibold text-foreground">
        {scene.title || sceneType?.defaultTitle || 'Scene'}
      </h2>
    </div>

    <div class="flex items-center gap-1">
      {#if canModify}
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
          onclick={() => (confirmDeleteOpen = true)}
          title="Delete scene"
        >
          <Trash2 class="size-4" />
        </button>
      {/if}
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        onclick={() => void minimize()}
        title="Minimize"
      >
        <Minimize2 class="size-4" />
      </button>
    </div>
  </header>

  <div class="min-h-0 flex-1">
    {#if !hasStarted}
      <SceneEntry readOnly={!canModify} onStart={handleStart} />
    {:else}
      <DocumentScenePanel
        {canvasId}
        {scene}
        {userId}
        {canModify}
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
