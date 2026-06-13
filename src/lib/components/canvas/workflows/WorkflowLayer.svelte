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
    WorkflowSettings
  } from '$lib/workflows/schema'
  import WorkflowBuilderPanels from '$lib/components/canvas/workflows/WorkflowBuilderPanels.svelte'
  import WorkflowFrame from '$lib/components/canvas/workflows/WorkflowFrame.svelte'

  type FrameHandlers = {
    pointerDown: (event: PointerEvent, workflowId: string) => void
    pointerMove: (event: PointerEvent, workflowId: string) => void
    pointerUp: (event: PointerEvent, workflowId: string) => void
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
    onCreateWorkflow: () => void
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

  const interactive = $derived(mode === 'workflows')
</script>

<div class="pointer-events-none absolute inset-0 z-10">
  {#each workflows as workflow (workflow.id)}
    {@const focused = focusedWorkflow?.id === workflow.id}
    <WorkflowFrame
      {workflow}
      {camera}
      {focused}
      canModify={canModifyWorkflow(workflow.id)}
      {interactive}
      {handlers}
      onFocus={onFocusWorkflow}
      onDelete={onDeleteWorkflow}
      onDefinitionChange={(definition) =>
        onPatchWorkflowDefinition(workflow.id, definition)}
    />
  {/each}
</div>

{#if mode === 'workflows' && canEdit}
  <button
    type="button"
    class="toolbar-pill fixed bottom-6 left-1/2 z-20 flex h-11 -translate-x-1/2 items-center gap-2 px-4 text-sm font-medium disabled:opacity-60"
    onclick={onCreateWorkflow}
    disabled={isCreatingWorkflow}
  >
    <Plus class="size-4" />
    {isCreatingWorkflow ? 'Creating…' : 'New workflow'}
  </button>
{/if}

{#if mode === 'workflows' && focusedWorkflow}
  <WorkflowBuilderPanels
    {canvasId}
    workflow={focusedWorkflow}
    {scenes}
    {sceneDocumentsStore}
    canModify={canModifyWorkflow(focusedWorkflow.id)}
    onClose={onClearFocusedWorkflow}
    onPatchWorkflow={(patch) => onPatchWorkflow(focusedWorkflow.id, patch)}
    onPatchYaml={(configYaml) =>
      onPatchWorkflowYaml(focusedWorkflow.id, configYaml)}
    onPatchNotes={(notes) => onPatchWorkflowNotes(focusedWorkflow.id, notes)}
    onPatchSettings={(settings) =>
      onPatchWorkflowSettings(focusedWorkflow.id, settings)}
  />
{/if}

{#if mode === 'workflows' && workflows.length === 0 && !isCreatingWorkflow}
  <div
    class="pointer-events-none fixed inset-x-0 bottom-24 z-10 flex justify-center"
  >
    <div
      class="flex items-center gap-2 rounded-full border border-border/80 bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur"
    >
      <WorkflowIcon class="size-4" />
      No workflows yet
    </div>
  </div>
{/if}
