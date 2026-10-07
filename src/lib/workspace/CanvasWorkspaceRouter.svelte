<script lang="ts">
  import { onMount } from 'svelte'
  import type { CanvasRole } from '#lib/canvas/roles.js'
  import type { Canvas } from '#lib/canvas/schema.js'
  import type { CanvasElement } from '#lib/workspace/schema.js'
  import type { Scene } from '#lib/scenes/schema.js'
  import type { Workflow } from '#lib/workflows/schema.js'
  import CanvasWorkspace from '#lib/components/canvas/workspace/CanvasWorkspace.svelte'
  import MobileCanvasWorkspace from '#lib/mobile/components/workspace/MobileCanvasWorkspace.svelte'
  import { createWorkspaceDeviceProfile } from '#lib/workspace/device-profile.svelte.js'

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
    workflowEnabled = false
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
  }>()

  const deviceProfileStore = createWorkspaceDeviceProfile()
  const deviceProfile = $derived(deviceProfileStore.profile)
  const useMobileWorkspace = $derived(deviceProfile.shell === 'phone')

  onMount(deviceProfileStore.mount)
</script>

{#if useMobileWorkspace}
  <MobileCanvasWorkspace
    {canvasId}
    {userId}
    {userEmail}
    {role}
    {isPublicViewer}
    {isAnonymousPublicViewer}
    {canvasTitle}
    {initialCanvases}
    {initialElements}
    {initialScenes}
    {initialWorkflows}
    {workflowEnabled}
    {deviceProfile}
  />
{:else}
  <CanvasWorkspace
    {canvasId}
    {userId}
    {userEmail}
    {role}
    {isPublicViewer}
    {isAnonymousPublicViewer}
    {canvasTitle}
    {initialCanvases}
    {initialElements}
    {initialScenes}
    {initialWorkflows}
    {workflowEnabled}
  />
{/if}
