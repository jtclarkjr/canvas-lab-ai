<script lang="ts">
  import type { Camera } from '$lib/canvas/types'
  import type { Scene } from '$lib/scenes/schema'
  import type { SceneActivity, WorkspaceMode } from '$lib/scenes/types'
  import type { WorkspaceDeviceProfile } from '$lib/workspace/device-profile/types'
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
    deviceProfile
  } = $props<{
    scenes: Scene[]
    camera: Camera
    mode: WorkspaceMode
    canModifyScene: (sceneId: string) => boolean
    activity: Record<string, SceneActivity>
    handlers: CardHandlers
    deviceProfile: WorkspaceDeviceProfile
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
