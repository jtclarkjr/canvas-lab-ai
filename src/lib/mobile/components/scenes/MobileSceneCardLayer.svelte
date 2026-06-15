<script lang="ts">
  import { Plus } from 'lucide-svelte'
  import type { Camera } from '$lib/canvas/types'
  import type { Scene } from '$lib/scenes/schema'
  import type { SceneActivity, WorkspaceMode } from '$lib/scenes/types'
  import type { WorkspaceDeviceProfile } from '$lib/workspace/device-profile.svelte'
  import MobileSceneCard from '$lib/mobile/components/scenes/MobileSceneCard.svelte'

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
    scenes,
    camera,
    mode,
    canEdit,
    canModifyScene,
    activity,
    handlers,
    isCreatingScene = false,
    deviceProfile,
    onCreateScene
  } = $props<{
    scenes: Scene[]
    camera: Camera
    mode: WorkspaceMode
    canEdit: boolean
    canModifyScene: (sceneId: string) => boolean
    activity: Record<string, SceneActivity>
    handlers: CardHandlers
    isCreatingScene?: boolean
    deviceProfile: WorkspaceDeviceProfile
    onCreateScene: () => void
  }>()
</script>

<div class="pointer-events-none absolute inset-0 z-10">
  {#each scenes as scene (scene.id)}
    <MobileSceneCard
      {scene}
      {camera}
      {deviceProfile}
      canModify={canModifyScene(scene.id)}
      activity={activity[scene.id] ?? null}
      {handlers}
      interactive={mode === 'scenes'}
    />
  {/each}
</div>

{#if mode === 'scenes' && canEdit}
  <button
    type="button"
    class="toolbar-pill fixed left-1/2 bottom-[calc(env(safe-area-inset-bottom)+7.75rem)] z-20 flex h-11 -translate-x-1/2 items-center gap-2 px-4 text-sm font-medium disabled:opacity-60"
    onclick={onCreateScene}
    disabled={isCreatingScene}
  >
    <Plus class="size-4" />
    {isCreatingScene ? 'Creating…' : 'New scene'}
  </button>
{/if}
