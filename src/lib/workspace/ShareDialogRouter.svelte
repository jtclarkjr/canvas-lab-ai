<script lang="ts">
  import type { AccessRequest, CanvasVisibility } from '$lib/canvas/schema'
  import type { CanvasRole } from '$lib/canvas/roles'
  import type { WorkspaceDeviceProfile } from '$lib/workspace/device-profile/types'
  import ShareDialog from '$lib/components/canvas/workspace/ShareDialog.svelte'
  import MobileShareDialog from '$lib/mobile/components/share/MobileShareDialog.svelte'

  let {
    open = $bindable(false),
    canvasId,
    canvasTitle = '',
    role,
    currentUserId,
    visibility = 'private',
    pendingRequests = [],
    deviceProfile,
    onRequestResolved,
    onVisibilityChange
  } = $props<{
    open?: boolean
    canvasId: string
    canvasTitle?: string
    role: CanvasRole
    currentUserId: string
    visibility?: CanvasVisibility
    pendingRequests?: AccessRequest[]
    deviceProfile: WorkspaceDeviceProfile
    onRequestResolved?: (requestId: string) => void
    onVisibilityChange?: (visibility: CanvasVisibility) => Promise<void> | void
  }>()
</script>

{#if deviceProfile.shell === 'phone'}
  <MobileShareDialog
    bind:open
    {canvasId}
    {canvasTitle}
    {role}
    {currentUserId}
    {visibility}
    {pendingRequests}
    {onRequestResolved}
    {onVisibilityChange}
  />
{:else}
  <ShareDialog
    bind:open
    {canvasId}
    {canvasTitle}
    {role}
    {currentUserId}
    {visibility}
    {pendingRequests}
    {onRequestResolved}
    {onVisibilityChange}
  />
{/if}
