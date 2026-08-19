<script lang="ts">
  import { FileText, Maximize2, NotebookPen, Sparkles } from 'lucide-svelte'
  import { IconButton } from '$lib/components/ui'
  import type { Camera } from '$lib/canvas/types'
  import type { Scene } from '$lib/scenes/schema'
  import type { SceneActivity } from '$lib/scenes/types'
  import { getSceneType } from '$lib/scenes/registry'
  import SceneResizeHandle from '$lib/components/canvas/scenes/SceneResizeHandle.svelte'

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
    canActivate,
    onActivate
  } = $props<{
    scene: Scene
    camera: Camera
    canModify: boolean
    activity: SceneActivity | null
    handlers: CardHandlers
    interactive: boolean
    canActivate: boolean
    onActivate: (sceneId: string) => void
  }>()

  const sceneType = $derived(getSceneType(scene.type))
  const TypeIcon = $derived(scene.type === 'notes' ? NotebookPen : FileText)

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

  function handlePointerDown(event: PointerEvent) {
    if (interactive) {
      handlers.pointerDown(event, scene.id)
      return
    }

    event.stopPropagation()
  }

  function handlePointerMove(event: PointerEvent) {
    if (interactive) {
      handlers.pointerMove(event, scene.id)
    }
  }

  function handlePointerUp(event: PointerEvent) {
    if (interactive) {
      handlers.pointerUp(event, scene.id)
    }
  }

  function handlePointerCancel(event: PointerEvent) {
    if (interactive) {
      handlers.pointerCancel(event, scene.id)
    }
  }

  function handleClick(event: MouseEvent) {
    if (interactive || !canActivate) return
    event.stopPropagation()
    onActivate(scene.id)
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    if (interactive) {
      handlers.open(event, scene.id)
      return
    }

    if (!canActivate) return
    onActivate(scene.id)
  }
</script>

<div
  class={`glass-card group ${interactive || canActivate ? 'pointer-events-auto' : 'pointer-events-none'} absolute flex ${
    interactive && canModify
      ? 'cursor-grab active:cursor-grabbing'
      : canActivate
        ? 'cursor-pointer'
        : 'cursor-default'
  } flex-col overflow-hidden p-3 transition-shadow hover:shadow-[0_18px_60px_rgba(15,23,42,0.2)]`}
  style={cardStyle}
  data-scene-id={scene.id}
  role="button"
  tabindex={interactive || canActivate ? 0 : -1}
  title={interactive ? 'Double-click to open' : 'Switch to scenes'}
  aria-label={`${interactive ? 'Open' : 'Switch to'} scene ${scene.title || sceneType?.defaultTitle || 'scene'}${interactive ? ' (double-click)' : ''}`}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerCancel}
  onclick={handleClick}
  ondblclick={(event) => handlers.open(event, scene.id)}
  onkeydown={handleKeydown}
>
  <div class="flex items-center gap-2">
    <TypeIcon
      class="size-4 shrink-0 text-muted-foreground"
      aria-hidden="true"
    />
    <span class="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
      {scene.title || sceneType?.defaultTitle || 'Scene'}
    </span>
    <IconButton
      label="Open scene"
      variant="ghost"
      class="hidden size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary group-hover:flex"
      onclick={(event) => handlers.open(event, scene.id)}
      title="Open scene"
    >
      <Maximize2 class="size-3.5" />
    </IconButton>
  </div>

  <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
    <span>{sceneType?.label ?? scene.type}</span>
    {#if activityLabel}
      <span
        class="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-foreground"
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

  {#if interactive && canModify}
    <SceneResizeHandle sceneId={scene.id} {handlers} />
  {/if}
</div>
