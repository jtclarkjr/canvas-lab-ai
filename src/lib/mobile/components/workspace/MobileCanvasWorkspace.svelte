<script lang="ts">
  import { onMount } from 'svelte'
  import type { CanvasRole } from '$lib/canvas/roles'
  import type { Canvas } from '$lib/canvas/schema'
  import type { CanvasElement } from '$lib/workspace/schema'
  import type { Scene } from '$lib/scenes/schema'
  import type { Workflow } from '$lib/workflows/schema'
  import type { WorkspaceDeviceProfile } from '$lib/workspace/device-profile.svelte'
  import { createCanvasWorkspaceStore } from '$lib/stores/workspace/index.svelte'
  import { provideCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import { provideCanvasConferenceStore } from '$lib/stores/conference/index.svelte'
  import { useSceneDocumentsStore } from '$lib/stores/scenes/documents.svelte'
  import MobileCanvasWorkspaceView from '$lib/mobile/components/workspace/MobileCanvasWorkspaceView.svelte'

  let {
    canvasId,
    userId,
    userEmail,
    role = 'owner',
    isPublicViewer = false,
    isAnonymousPublicViewer = false,
    canvasTitle,
    initialCanvases,
    initialElements,
    initialScenes,
    initialWorkflows,
    workflowEnabled = false,
    deviceProfile
  } = $props<{
    canvasId: string
    userId: string
    userEmail?: string | null
    role?: CanvasRole
    isPublicViewer?: boolean
    isAnonymousPublicViewer?: boolean
    canvasTitle?: string
    initialCanvases?: Canvas[]
    initialElements?: CanvasElement[]
    initialScenes?: Scene[]
    initialWorkflows?: Workflow[]
    workflowEnabled?: boolean
    deviceProfile: WorkspaceDeviceProfile
  }>()

  // svelte-ignore state_referenced_locally -- route usage provides context;
  // this fallback only supports isolated component renders/tests.
  const sceneDocumentsStore = useSceneDocumentsStore({
    canvasId,
    initialItemsBySceneId: {}
  })

  function currentWorkspaceInput() {
    return {
      canvasId,
      userId,
      userEmail,
      role,
      isPublicViewer,
      isAnonymousPublicViewer,
      canvasTitle,
      initialCanvases,
      initialElements,
      initialScenes,
      initialWorkflows,
      workflowEnabled,
      sceneDocumentsStore
    }
  }

  const workspace = createCanvasWorkspaceStore(currentWorkspaceInput())

  provideCanvasChatStore({
    getCanvasId: () => workspace.canvasIdForActions,
    getUserId: () => userId,
    getEnabled: () =>
      !workspace.isPublicViewer &&
      !workspace.isAnonymousPublicViewer &&
      Boolean(userId)
  })

  provideCanvasConferenceStore({
    getCanvasId: () => workspace.canvasIdForActions,
    getUserId: () => userId,
    getEnabled: () =>
      !workspace.isPublicViewer &&
      !workspace.isAnonymousPublicViewer &&
      Boolean(userId)
  })

  let rootEl = $state<HTMLDivElement | null>(null)
  let svgEl = $state<SVGSVGElement | null>(null)
  let textInputEl = $state<HTMLTextAreaElement | null>(null)
  let phonePanDefaultCanvasId = $state<string | null>(null)

  $effect(() => {
    workspace.setProps(currentWorkspaceInput())
  })

  $effect(() => {
    workspace.setElements({ rootEl, svgEl, textInputEl })
  })

  $effect(() => {
    const activeCanvasId = workspace.activeCanvasId
    if (!activeCanvasId || phonePanDefaultCanvasId === activeCanvasId) {
      return
    }

    if (
      workspace.canEdit &&
      workspace.mode === 'editor' &&
      workspace.selectedTool === 'select'
    ) {
      workspace.handleToolChange('hand')
    }

    phonePanDefaultCanvasId = activeCanvasId
  })

  onMount(workspace.mount)
</script>

<div
  bind:this={rootEl}
  class="canvas-interaction-surface relative h-[100dvh] w-screen overflow-hidden"
  onpointerdown={workspace.handleViewportPointerDown}
  onpointermove={workspace.handleViewportPointerMove}
  onpointerup={workspace.handleViewportPointerUp}
  onpointercancel={workspace.handleViewportPointerUp}
  onpointerleave={workspace.handleViewportPointerUp}
  style={workspace.rootStyle}
  role="region"
  aria-label="Drawing workspace"
>
  <MobileCanvasWorkspaceView
    {workspace}
    {userId}
    {deviceProfile}
    {sceneDocumentsStore}
    bind:svgEl
    bind:textInputEl
  />
</div>
