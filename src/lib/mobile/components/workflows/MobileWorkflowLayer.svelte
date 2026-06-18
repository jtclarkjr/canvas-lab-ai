<script lang="ts">
  import { Plus, Workflow as WorkflowIcon } from 'lucide-svelte'
  import type { Camera } from '$lib/canvas/types'
  import type { Scene } from '$lib/scenes/schema'
  import type { SceneDocumentsStore } from '$lib/stores/scenes/documents.svelte'
  import type { WorkspaceMode } from '$lib/scenes/types'
  import type {
    UpdateWorkflowInput,
    Workflow,
    WorkflowDefinition,
    WorkflowFlowType,
    WorkflowSettings
  } from '$lib/workflows/schema'
  import MobileWorkflowCard from '$lib/mobile/components/workflows/MobileWorkflowCard.svelte'
  import MobileWorkflowCreateSheet from '$lib/mobile/components/workflows/MobileWorkflowCreateSheet.svelte'
  import MobileWorkflowFullscreen from '$lib/mobile/components/workflows/MobileWorkflowFullscreen.svelte'
  import MobileWorkflowListSheet from '$lib/mobile/components/workflows/MobileWorkflowListSheet.svelte'

  type FrameHandlers = {
    pointerDown: (event: PointerEvent, workflowId: string) => void
    pointerMove: (event: PointerEvent, workflowId: string) => void
    pointerUp: (
      event: PointerEvent,
      workflowId: string,
      options?: { focusOnClick?: boolean }
    ) => void
    pointerCancel: (event: PointerEvent, workflowId: string) => void
    resizePointerDown: (event: PointerEvent, workflowId: string) => void
    resizePointerMove: (event: PointerEvent, workflowId: string) => void
    resizePointerUp: (event: PointerEvent, workflowId: string) => void
    resizePointerCancel: (event: PointerEvent, workflowId: string) => void
  }

  let {
    canvasId,
    workflows,
    focusedWorkflow,
    scenes,
    sceneDocumentsStore,
    camera,
    mode,
    canEdit,
    canModifyWorkflow,
    handlers,
    isCreatingWorkflow = false,
    onCreateWorkflow,
    onFocusWorkflow,
    onClearFocusedWorkflow,
    onDeleteWorkflow,
    onPatchWorkflow,
    onPatchWorkflowDefinition,
    onPatchWorkflowYaml,
    onPatchWorkflowNotes,
    onPatchWorkflowSettings
  } = $props<{
    canvasId: string
    workflows: Workflow[]
    focusedWorkflow: Workflow | null
    scenes: Scene[]
    sceneDocumentsStore: SceneDocumentsStore
    camera: Camera
    mode: WorkspaceMode
    canEdit: boolean
    canModifyWorkflow: (workflowId: string) => boolean
    handlers: FrameHandlers
    isCreatingWorkflow?: boolean
    onCreateWorkflow: (flowType?: WorkflowFlowType) => void
    onFocusWorkflow: (workflowId: string) => void
    onClearFocusedWorkflow: () => void
    onDeleteWorkflow: (workflowId: string) => void
    onPatchWorkflow: (
      workflowId: string,
      patch: UpdateWorkflowInput
    ) => Promise<Workflow | null>
    onPatchWorkflowDefinition: (
      workflowId: string,
      definition: WorkflowDefinition
    ) => Promise<Workflow | null>
    onPatchWorkflowYaml: (
      workflowId: string,
      configYaml: string
    ) => Promise<Workflow | null>
    onPatchWorkflowNotes: (
      workflowId: string,
      notes: string
    ) => Promise<Workflow | null>
    onPatchWorkflowSettings: (
      workflowId: string,
      settings: WorkflowSettings
    ) => Promise<Workflow | null>
  }>()

  let createOpen = $state(false)
  let listOpen = $state(false)
  let fullscreenWorkflowId = $state<string | null>(null)
  const interactive = $derived(mode === 'workflows')
  const fullscreenWorkflow = $derived(
    workflows.find(
      (workflow: Workflow) => workflow.id === fullscreenWorkflowId
    ) ?? focusedWorkflow
  )

  $effect(() => {
    if (mode !== 'workflows') {
      createOpen = false
      listOpen = false
      fullscreenWorkflowId = null
    }
  })

  $effect(() => {
    if (
      fullscreenWorkflowId &&
      !workflows.some(
        (workflow: Workflow) => workflow.id === fullscreenWorkflowId
      )
    ) {
      fullscreenWorkflowId = null
    }
  })

  function openWorkflow(workflowId: string) {
    createOpen = false
    listOpen = false
    fullscreenWorkflowId = workflowId
    onFocusWorkflow(workflowId)
  }

  function closeFullscreen() {
    fullscreenWorkflowId = null
    onClearFocusedWorkflow()
  }

  function createWorkflow(flowType: WorkflowFlowType) {
    createOpen = false
    listOpen = false
    onCreateWorkflow(flowType)
  }

  function deleteWorkflow(workflowId: string) {
    if (!window.confirm('Delete this workflow?')) return
    if (fullscreenWorkflowId === workflowId) {
      fullscreenWorkflowId = null
    }
    onDeleteWorkflow(workflowId)
  }
</script>

<div class="pointer-events-none absolute inset-0 z-10">
  {#each workflows as workflow (workflow.id)}
    <MobileWorkflowCard
      {workflow}
      {camera}
      {interactive}
      canModify={canModifyWorkflow(workflow.id)}
      {handlers}
      onOpen={openWorkflow}
      onDelete={deleteWorkflow}
    />
  {/each}
</div>

{#if interactive && workflows.length > 0 && !fullscreenWorkflow}
  <button
    type="button"
    class="toolbar-pill fixed right-3 top-[calc(env(safe-area-inset-top)+4.25rem)] z-20 flex size-11 items-center justify-center"
    onclick={() => (listOpen = true)}
    aria-label="Open workflow list"
  >
    <WorkflowIcon class="size-5" aria-hidden="true" />
  </button>
{/if}

{#if interactive && canEdit && !fullscreenWorkflow}
  <button
    type="button"
    class="toolbar-pill fixed left-1/2 bottom-[calc(env(safe-area-inset-bottom)+7.75rem)] z-20 flex h-11 -translate-x-1/2 items-center gap-2 px-4 text-sm font-medium disabled:opacity-60"
    onclick={() => (createOpen = true)}
    disabled={isCreatingWorkflow}
  >
    <Plus class="size-4" aria-hidden="true" />
    {isCreatingWorkflow ? 'Creating...' : 'New workflow'}
  </button>
{/if}

{#if interactive && workflows.length === 0 && !isCreatingWorkflow}
  <div
    class="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+7.75rem)] z-10 flex justify-center"
  >
    <div
      class="flex items-center gap-2 rounded-full border border-border/80 bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur"
    >
      <WorkflowIcon class="size-4" aria-hidden="true" />
      No workflow items yet
    </div>
  </div>
{/if}

{#if listOpen}
  <MobileWorkflowListSheet
    {workflows}
    {canEdit}
    onOpen={openWorkflow}
    onCreateRequest={() => {
      listOpen = false
      createOpen = true
    }}
    onClose={() => (listOpen = false)}
  />
{/if}

{#if createOpen}
  <MobileWorkflowCreateSheet
    isCreating={isCreatingWorkflow}
    onClose={() => (createOpen = false)}
    onCreate={createWorkflow}
  />
{/if}

{#if interactive && fullscreenWorkflow}
  <MobileWorkflowFullscreen
    {canvasId}
    workflow={fullscreenWorkflow}
    {scenes}
    {sceneDocumentsStore}
    {canEdit}
    canModify={canModifyWorkflow(fullscreenWorkflow.id)}
    onMinimize={closeFullscreen}
    onDelete={deleteWorkflow}
    onPatchWorkflow={(patch) => onPatchWorkflow(fullscreenWorkflow.id, patch)}
    onPatchYaml={(configYaml) =>
      onPatchWorkflowYaml(fullscreenWorkflow.id, configYaml)}
    onPatchNotes={(notes) => onPatchWorkflowNotes(fullscreenWorkflow.id, notes)}
    onPatchSettings={(settings) =>
      onPatchWorkflowSettings(fullscreenWorkflow.id, settings)}
  />
{/if}
