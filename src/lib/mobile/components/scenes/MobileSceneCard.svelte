<script lang="ts">
  import {
    FileText,
    GripVertical,
    Maximize2,
    NotebookPen,
    Sparkles
  } from 'lucide-svelte'
  import type { Camera } from '$lib/canvas/types'
  import type { Scene } from '$lib/scenes/schema'
  import type { SceneActivity } from '$lib/scenes/types'
  import { getSceneType } from '$lib/scenes/registry'
  import type { WorkspaceDeviceProfile } from '$lib/workspace/device-profile.svelte'

  type CardHandlers = {
    pointerDown: (event: PointerEvent, sceneId: string) => void
    pointerMove: (event: PointerEvent, sceneId: string) => void
    pointerUp: (event: PointerEvent, sceneId: string) => void
    pointerCancel: (event: PointerEvent, sceneId: string) => void
    open: (event: Event, sceneId: string) => void
    resizePointerDown: (event: PointerEvent, sceneId: string) => void
    resizePointerMove: (event: PointerEvent, sceneId: string) => void
    resizePointerUp: (event: PointerEvent, sceneId: string) => void
    resizePointerCancel: (event: PointerEvent, sceneId: string) => void
  }

  let {
    scene,
    camera,
    canModify,
    activity,
    handlers,
    interactive,
    deviceProfile
  } = $props<{
    scene: Scene
    camera: Camera
    canModify: boolean
    activity: SceneActivity | null
    handlers: CardHandlers
    interactive: boolean
    deviceProfile: WorkspaceDeviceProfile
  }>()

  const sceneType = $derived(getSceneType(scene.type))
  const TypeIcon = $derived(scene.type === 'notes' ? NotebookPen : FileText)
  const touchLike = $derived(deviceProfile.isTouchLike)

  const cardStyle = $derived(
    `left:${camera.x + scene.x * camera.scale}px;` +
      `top:${camera.y + scene.y * camera.scale}px;` +
      `width:${scene.width * camera.scale}px;` +
      `height:${scene.height * camera.scale}px;` +
      `transform:rotate(${scene.rotation}deg);` +
      'transform-origin:center;' +
      'touch-action:none'
  )

  const activityLabels: Record<string, string> = {
    generating: 'Generating…',
    drawing: 'Drawing…'
  }
  const activityLabel = $derived(
    activity ? (activityLabels[activity.kind] ?? null) : null
  )

  function handleOpen(event: Event) {
    handlers.open(event, scene.id)
  }

  function dragDown(event: PointerEvent) {
    event.stopPropagation()
    handlers.pointerDown(event, scene.id)
  }

  function dragMove(event: PointerEvent) {
    event.stopPropagation()
    handlers.pointerMove(event, scene.id)
  }

  function dragUp(event: PointerEvent) {
    event.stopPropagation()
    handlers.pointerUp(event, scene.id)
  }

  function dragCancel(event: PointerEvent) {
    event.stopPropagation()
    handlers.pointerCancel(event, scene.id)
  }
</script>

<div
  class={`glass-card group ${touchLike ? 'pointer-events-auto' : interactive ? 'pointer-events-auto' : 'pointer-events-none'} absolute flex cursor-pointer flex-col overflow-hidden p-3 text-left transition-shadow active:scale-[0.99]`}
  style={cardStyle}
  data-scene-id={scene.id}
  role="button"
  tabindex="0"
  title="Open scene"
  aria-label={`Open scene ${scene.title || sceneType?.defaultTitle || 'scene'}`}
  onclick={handleOpen}
  onkeydown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handlers.open(event, scene.id)
    }
  }}
>
  <div class="flex items-center gap-2">
    <TypeIcon
      class="size-4 shrink-0 text-muted-foreground"
      aria-hidden="true"
    />
    <span class="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
      {scene.title || sceneType?.defaultTitle || 'Scene'}
    </span>
    {#if interactive && canModify}
      <button
        type="button"
        class="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-muted-foreground transition active:cursor-grabbing active:bg-secondary"
        onpointerdown={dragDown}
        onpointermove={dragMove}
        onpointerup={dragUp}
        onpointercancel={dragCancel}
        onclick={(event) => event.stopPropagation()}
        aria-label="Move scene"
      >
        <GripVertical class="size-4" aria-hidden="true" />
      </button>
    {/if}
    <button
      type="button"
      class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
      onclick={(event) => {
        event.stopPropagation()
        handlers.open(event, scene.id)
      }}
      title="Open scene"
      aria-label="Open scene"
    >
      <Maximize2 class="size-3.5" />
    </button>
  </div>

  <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
    <span>{sceneType?.label ?? scene.type}</span>
    {#if activityLabel}
      <span
        class="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary"
        aria-live="polite"
        aria-label={`${activity?.userName ?? 'A collaborator'} is ${activityLabel?.toLowerCase()}`}
      >
        <Sparkles class="size-3 animate-pulse" aria-hidden="true" />
        {activityLabel}
      </span>
    {/if}
  </div>

  <div
    class="mt-2 flex-1 overflow-hidden text-xs leading-relaxed text-muted-foreground"
  >
    {#if typeof scene.settings.preview === 'string' && scene.settings.preview}
      {scene.settings.preview}
    {:else}
      <span class="italic opacity-70">Click to open</span>
    {/if}
  </div>
</div>
