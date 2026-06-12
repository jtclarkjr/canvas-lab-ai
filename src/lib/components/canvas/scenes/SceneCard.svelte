<script lang="ts">
  import { FileText, NotebookPen, Sparkles } from 'lucide-svelte'
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

  let { scene, camera, canModify, activity, handlers } = $props<{
    scene: Scene
    camera: Camera
    canModify: boolean
    activity: SceneActivity | null
    handlers: CardHandlers
  }>()

  const sceneType = $derived(getSceneType(scene.type))
  const TypeIcon = $derived(scene.type === 'notes' ? NotebookPen : FileText)

  const cardStyle = $derived(
    `left:${camera.x + scene.x * camera.scale}px;` +
      `top:${camera.y + scene.y * camera.scale}px;` +
      `width:${scene.width * camera.scale}px;` +
      `height:${scene.height * camera.scale}px;` +
      'touch-action:none'
  )

  const activityLabels: Record<string, string> = {
    generating: 'Generating…',
    drawing: 'Drawing…'
  }
  const activityLabel = $derived(activity ? (activityLabels[activity.kind] ?? null) : null)
</script>

<div
  class="glass-card pointer-events-auto absolute flex cursor-grab flex-col overflow-hidden p-3 transition-shadow hover:shadow-[0_18px_60px_rgba(15,23,42,0.2)] active:cursor-grabbing"
  style={cardStyle}
  data-scene-id={scene.id}
  role="button"
  tabindex="0"
  aria-label={`Open scene ${scene.title || sceneType?.defaultTitle || 'scene'} (double-click)`}
  onpointerdown={(event) => handlers.pointerDown(event, scene.id)}
  onpointermove={(event) => handlers.pointerMove(event, scene.id)}
  onpointerup={(event) => handlers.pointerUp(event, scene.id)}
  onpointercancel={(event) => handlers.pointerCancel(event, scene.id)}
  ondblclick={(event) => handlers.open(event, scene.id)}
  onkeydown={(event) => {
    if (event.key === 'Enter') handlers.open(event, scene.id)
  }}
>
  <div class="flex items-center gap-2">
    <TypeIcon class="size-4 shrink-0 text-muted-foreground" />
    <span class="truncate text-sm font-semibold text-foreground">
      {scene.title || sceneType?.defaultTitle || 'Scene'}
    </span>
  </div>

  <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
    <span>{sceneType?.label ?? scene.type}</span>
    {#if activityLabel}
      <span class="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
        <Sparkles class="size-3 animate-pulse" />
        {activityLabel}
      </span>
    {/if}
  </div>

  <div class="mt-2 flex-1 overflow-hidden text-xs leading-relaxed text-muted-foreground">
    {#if typeof scene.settings.preview === 'string' && scene.settings.preview}
      {scene.settings.preview}
    {:else}
      <span class="italic opacity-70">Click to open</span>
    {/if}
  </div>

  {#if canModify}
    <SceneResizeHandle sceneId={scene.id} {handlers} />
  {/if}
</div>
