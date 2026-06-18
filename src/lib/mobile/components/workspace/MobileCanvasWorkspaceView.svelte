<script lang="ts">
  import type { SceneDocumentsStore } from '$lib/stores/scenes/documents.svelte'
  import type { WorkflowFlowType } from '$lib/workflows/schema'
  import type { CanvasWorkspaceStore } from '$lib/mobile/types'
  import type { WorkspaceDeviceProfile } from '$lib/workspace/device-profile.svelte'
  import CanvasSurface from '$lib/components/canvas/CanvasSurface.svelte'
  import TextEditor from '$lib/components/shared/TextEditor.svelte'
  import LiveCursors from '$lib/components/canvas/workspace/LiveCursors.svelte'
  import MobileCanvasChat from '$lib/mobile/components/chat/MobileCanvasChat.svelte'
  import MobileCanvasConference from '$lib/mobile/components/conference/MobileCanvasConference.svelte'
  import MobileRequestEditAccessBanner from '$lib/mobile/components/workspace/MobileRequestEditAccessBanner.svelte'
  import MobileSceneDialog from '$lib/mobile/components/scenes/MobileSceneDialog.svelte'
  import MobileSceneCardLayer from '$lib/mobile/components/scenes/MobileSceneCardLayer.svelte'
  import MobileWorkspaceChrome from '$lib/mobile/components/workspace/MobileWorkspaceChrome.svelte'
  import MobileWorkflowLayer from '$lib/mobile/components/workflows/MobileWorkflowLayer.svelte'
  import ShareDialogRouter from '$lib/workspace/ShareDialogRouter.svelte'

  let {
    workspace,
    userId,
    deviceProfile,
    sceneDocumentsStore,
    svgEl = $bindable(null),
    textInputEl = $bindable(null)
  } = $props<{
    workspace: CanvasWorkspaceStore
    userId: string
    deviceProfile: WorkspaceDeviceProfile
    sceneDocumentsStore: SceneDocumentsStore
    svgEl?: SVGSVGElement | null
    textInputEl?: HTMLTextAreaElement | null
  }>()
</script>

<div class="absolute inset-0 screen-grid"></div>

<MobileWorkspaceChrome {workspace} />

{#if !workspace.isAnonymousPublicViewer}
  <ShareDialogRouter
    bind:open={workspace.shareDialogOpen}
    canvasId={workspace.canvasIdForActions}
    canvasTitle={workspace.currentCanvasTitle}
    role={workspace.role}
    currentUserId={userId}
    visibility={workspace.currentCanvasVisibility}
    pendingRequests={workspace.pendingRequests}
    {deviceProfile}
    onRequestResolved={workspace.handleRequestResolved}
    onVisibilityChange={workspace.saveVisibility}
  />
{/if}

{#if workspace.canvasesError || workspace.scenesError || (workspace.workflowEnabled && workspace.workflowsError)}
  <div
    class="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg"
  >
    {workspace.canvasesError ??
      workspace.scenesError ??
      workspace.workflowsError}
  </div>
{/if}

<CanvasSurface
  bind:svgEl
  camera={workspace.camera}
  canEdit={workspace.canEdit}
  selectedTool={workspace.selectedTool}
  drawFormatting={workspace.drawFormatting}
  editingText={workspace.editingText}
  elements={workspace.sceneElements}
  selection={workspace.sceneSelection}
  handlers={workspace.sceneHandlers}
/>

{#if !workspace.isAnonymousPublicViewer}
  <MobileSceneCardLayer
    {deviceProfile}
    scenes={workspace.scenes}
    camera={workspace.camera}
    mode={workspace.mode}
    canEdit={workspace.canEdit}
    canModifyScene={workspace.canModifyScene}
    activity={workspace.sceneActivity}
    handlers={workspace.sceneCardHandlers}
    isCreatingScene={workspace.isCreatingScene}
    onCreateScene={() => void workspace.createScene('document')}
  />
{/if}

{#if !workspace.isAnonymousPublicViewer && workspace.workflowEnabled}
  <MobileWorkflowLayer
    canvasId={workspace.canvasIdForActions}
    workflows={workspace.workflows}
    focusedWorkflow={workspace.focusedWorkflow}
    scenes={workspace.scenes}
    {sceneDocumentsStore}
    camera={workspace.camera}
    mode={workspace.mode}
    canEdit={workspace.canEdit}
    canModifyWorkflow={workspace.canModifyWorkflow}
    handlers={workspace.workflowFrameHandlers}
    isCreatingWorkflow={workspace.isCreatingWorkflow}
    onCreateWorkflow={(flowType?: WorkflowFlowType) =>
      void workspace.createWorkflow(flowType)}
    onFocusWorkflow={workspace.focusWorkflow}
    onClearFocusedWorkflow={workspace.clearFocusedWorkflow}
    onDeleteWorkflow={(workflowId: string) =>
      void workspace.deleteWorkflow(workflowId)}
    onPatchWorkflow={workspace.patchWorkflow}
    onPatchWorkflowDefinition={workspace.patchWorkflowDefinition}
    onPatchWorkflowYaml={workspace.patchWorkflowYaml}
    onPatchWorkflowNotes={workspace.patchWorkflowNotes}
    onPatchWorkflowSettings={workspace.patchWorkflowSettings}
  />
{/if}

<TextEditor
  bind:textInputEl
  camera={workspace.camera}
  editingText={workspace.editingText}
  textFormatting={workspace.textFormatting}
  onValueChange={workspace.applyEditorValue}
  onBlur={workspace.handleTextInputBlur}
  onKeydown={workspace.handleTextEditorKeydown}
  onSelectionChange={workspace.syncEditorSelection}
/>

<LiveCursors cursors={workspace.cursors} camera={workspace.camera} />

{#if !workspace.isPublicViewer && userId}
  <MobileCanvasChat canvasId={workspace.canvasIdForActions} {userId} />
{/if}

{#if !workspace.isAnonymousPublicViewer}
  <MobileCanvasConference />
{/if}

{#if workspace.isPublicViewer || workspace.role === 'reader'}
  <MobileRequestEditAccessBanner
    canvasId={workspace.canvasIdForActions}
    isPublicViewer={workspace.isPublicViewer}
    isAnonymousPublicViewer={workspace.isAnonymousPublicViewer}
  />
{/if}

{#if !workspace.isAnonymousPublicViewer && workspace.openScene}
  {@const open = workspace.openScene}
  {#key open.scene.id}
    <MobileSceneDialog
      canvasId={workspace.canvasIdForActions}
      scene={open.scene}
      {userId}
      originRect={open.originRect}
      canModify={workspace.canModifyScene(open.scene.id)}
      {sceneDocumentsStore}
      documentRevision={workspace.sceneDocumentRevisions[open.scene.id] ?? 0}
      liveMessages={workspace.sceneLiveMessages[open.scene.id] ?? []}
      remoteActivity={workspace.sceneActivity[open.scene.id] ?? null}
      remoteStreamingText={workspace.sceneStreamingText[open.scene.id] ?? ''}
      {deviceProfile}
      onClose={workspace.closeOpenScene}
      onPatchScene={(patch) => workspace.patchScene(open.scene.id, patch)}
      onDeleteScene={() => void workspace.deleteScene(open.scene.id)}
      onBroadcastActivity={(kind, textDelta) =>
        workspace.broadcastSceneActivity(open.scene.id, kind, textDelta)}
    />
  {/key}
{/if}
