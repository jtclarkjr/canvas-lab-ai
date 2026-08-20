<script lang="ts">
  import {
    ChevronDown,
    Database,
    Plus,
    Workflow as WorkflowIcon
  } from 'lucide-svelte'
  import type { Camera, Tool } from '$lib/canvas/types'
  import type { Scene } from '$lib/scenes/schema'
  import type { SceneDocumentsStore } from '$lib/stores/scenes/documents/types'
  import type { WorkspaceMode } from '$lib/scenes/types'
  import type {
    UpdateWorkflowInput,
    Workflow,
    WorkflowDefinition,
    WorkflowFlowType,
    WorkflowSettings
  } from '$lib/workflows/schema'
  import { workflowFlowTypeOptions } from '$lib/workflows/flow-types'
  import { ConfirmDialog } from '$lib/components/shared/feedback'
  import WorkflowBuilderPanels from '$lib/components/canvas/workflows/WorkflowBuilderPanels.svelte'
  import WorkflowFrame from '$lib/components/canvas/workflows/WorkflowFrame.svelte'
  import WorkflowFullscreenView from '$lib/components/canvas/workflows/WorkflowFullscreenView.svelte'

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

  const FLOW_TYPE_ICONS = {
    workflow: WorkflowIcon,
    database: Database
  } satisfies Record<WorkflowFlowType, typeof WorkflowIcon>

  const CREATE_FLOW_TYPES = workflowFlowTypeOptions.map((option) => ({
    ...option,
    icon: FLOW_TYPE_ICONS[option.id]
  }))

  let {
    canvasId,
    workflows,
    focusedWorkflow,
    scenes,
    sceneDocumentsStore,
    camera,
    mode,
    selectedTool,
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
    selectedTool: Tool
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

  const interactive = $derived(mode === 'workflows')
  const canActivateFrames = $derived(
    !interactive && (mode !== 'editor' || !canEdit || selectedTool === 'select')
  )
  let selectedCreateType = $state<WorkflowFlowType>('workflow')
  let createMenuOpen = $state(false)
  let fullscreenWorkflowId = $state<string | null>(null)
  let deleteWorkflowId = $state<string | null>(null)
  let confirmDeleteOpen = $state(false)
  const selectedCreateOption = $derived(
    CREATE_FLOW_TYPES.find((entry) => entry.id === selectedCreateType) ??
      CREATE_FLOW_TYPES[0]
  )
  const fullscreenWorkflow = $derived(
    workflows.find(
      (workflow: Workflow) => workflow.id === fullscreenWorkflowId
    ) ?? null
  )
  const workflowPendingDelete = $derived(
    workflows.find((workflow: Workflow) => workflow.id === deleteWorkflowId) ??
      null
  )

  $effect(() => {
    if (
      mode !== 'workflows' ||
      (fullscreenWorkflowId &&
        !workflows.some(
          (workflow: Workflow) => workflow.id === fullscreenWorkflowId
        ))
    ) {
      fullscreenWorkflowId = null
    }
  })

  function createSelectedWorkflow() {
    createMenuOpen = false
    onCreateWorkflow(selectedCreateType)
  }

  function selectCreateType(flowType: WorkflowFlowType) {
    selectedCreateType = flowType
    createMenuOpen = false
  }

  function maximizeWorkflow(workflowId: string) {
    createMenuOpen = false
    fullscreenWorkflowId = workflowId
    onFocusWorkflow(workflowId)
  }

  function minimizeFullscreenWorkflow() {
    fullscreenWorkflowId = null
  }

  function requestDeleteWorkflow(workflowId: string) {
    deleteWorkflowId = workflowId
    confirmDeleteOpen = true
  }

  function confirmDeleteWorkflow() {
    if (!deleteWorkflowId) return
    if (fullscreenWorkflowId === deleteWorkflowId) {
      fullscreenWorkflowId = null
    }
    onDeleteWorkflow(deleteWorkflowId)
    deleteWorkflowId = null
  }
</script>

<div class="pointer-events-none absolute inset-0 z-10">
  {#each workflows as workflow (workflow.id)}
    {@const focused = focusedWorkflow?.id === workflow.id}
    <WorkflowFrame
      {workflow}
      {camera}
      focused={interactive && focused && fullscreenWorkflowId !== workflow.id}
      canModify={canModifyWorkflow(workflow.id)}
      canDrag={canEdit && canModifyWorkflow(workflow.id)}
      canActivate={canActivateFrames}
      {interactive}
      {handlers}
      onFocus={onFocusWorkflow}
      onMaximize={maximizeWorkflow}
      onDelete={requestDeleteWorkflow}
      onRename={(workflowId, title) => onPatchWorkflow(workflowId, { title })}
      onDefinitionChange={(definition) =>
        onPatchWorkflowDefinition(workflow.id, definition)}
    />
  {/each}
</div>

{#if mode === 'workflows' && fullscreenWorkflow}
  <WorkflowFullscreenView
    workflow={fullscreenWorkflow}
    {canEdit}
    canModify={canModifyWorkflow(fullscreenWorkflow.id)}
    onMinimize={minimizeFullscreenWorkflow}
    onDelete={requestDeleteWorkflow}
    onRename={(workflowId, title) => onPatchWorkflow(workflowId, { title })}
    onDefinitionChange={(definition) =>
      onPatchWorkflowDefinition(fullscreenWorkflow.id, definition)}
  />
{/if}

<ConfirmDialog
  bind:open={confirmDeleteOpen}
  title="Delete workflow?"
  message={`“${workflowPendingDelete?.title || 'This workflow'}” and its saved definition, notes, and versions will be permanently deleted.`}
  confirmLabel="Delete workflow"
  onConfirm={confirmDeleteWorkflow}
/>

{#if mode === 'workflows' && canEdit && !fullscreenWorkflow}
  <div class="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center">
    <div class="relative">
      <div class="toolbar-pill flex h-11 items-center overflow-hidden p-0">
        <button
          type="button"
          class="flex h-full items-center gap-2 px-4 text-sm font-medium disabled:opacity-60"
          onclick={createSelectedWorkflow}
          disabled={isCreatingWorkflow}
        >
          <Plus class="size-4" />
          {isCreatingWorkflow
            ? 'Creating...'
            : selectedCreateOption.createLabel}
        </button>
        <button
          type="button"
          class="flex h-full w-10 items-center justify-center border-l border-border/70 text-muted-foreground transition hover:text-foreground disabled:opacity-60"
          onclick={() => (createMenuOpen = !createMenuOpen)}
          disabled={isCreatingWorkflow}
          aria-label="Choose workflow item type"
          aria-expanded={createMenuOpen}
          aria-haspopup="menu"
        >
          <ChevronDown class="size-4" aria-hidden="true" />
        </button>
      </div>

      {#if createMenuOpen}
        <div
          class="absolute bottom-full left-0 mb-2 min-w-[190px] rounded-lg border border-border/70 bg-popover p-1 text-popover-foreground shadow-xl"
          role="menu"
        >
          {#each CREATE_FLOW_TYPES as option (option.id)}
            <button
              type="button"
              class={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium transition ${
                selectedCreateType === option.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
              role="menuitemradio"
              aria-checked={selectedCreateType === option.id}
              onclick={() => selectCreateType(option.id)}
            >
              <option.icon class="size-4" aria-hidden="true" />
              {option.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if mode === 'workflows' && focusedWorkflow && canModifyWorkflow(focusedWorkflow.id)}
  <WorkflowBuilderPanels
    {canvasId}
    workflow={focusedWorkflow}
    {scenes}
    {sceneDocumentsStore}
    canModify={canModifyWorkflow(focusedWorkflow.id)}
    fullscreen={Boolean(fullscreenWorkflow)}
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
      No workflow items yet
    </div>
  </div>
{/if}
