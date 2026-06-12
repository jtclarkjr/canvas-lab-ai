<script lang="ts">
  import { Plus } from 'lucide-svelte'
  import type { Camera } from '$lib/canvas/types'
  import type { Scene } from '$lib/scenes/schema'
  import type { SceneActivity, WorkspaceMode } from '$lib/scenes/types'
  import SceneCard from '$lib/components/canvas/scenes/SceneCard.svelte'

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

  let { scenes, camera, mode, canEdit, canModifyScene, activity, handlers, onCreateScene } =
    $props<{
      scenes: Scene[]
      camera: Camera
      mode: WorkspaceMode
      canEdit: boolean
      canModifyScene: (sceneId: string) => boolean
      activity: Record<string, SceneActivity>
      handlers: CardHandlers
      onCreateScene: () => void
    }>()
</script>

<!-- Cards live above the drawing SVG in both modes; each card handles its
     own pointer events and stops propagation, so canvas tools and panning
     are unaffected outside the cards. -->
<div class="pointer-events-none absolute inset-0 z-10">
  {#each scenes as scene (scene.id)}
    <SceneCard
      {scene}
      {camera}
      canModify={canModifyScene(scene.id)}
      activity={activity[scene.id] ?? null}
      {handlers}
    />
  {/each}
</div>

{#if mode === 'scenes' && canEdit}
  <button
    type="button"
    class="toolbar-pill fixed bottom-6 left-1/2 z-20 flex h-11 -translate-x-1/2 items-center gap-2 px-4 text-sm font-medium transition hover:border-slate-700 hover:bg-slate-900"
    onclick={onCreateScene}
  >
    <Plus class="size-4" />
    New scene
  </button>
{/if}
