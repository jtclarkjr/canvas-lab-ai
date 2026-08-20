<script lang="ts">
  import {
    Bot,
    CodeXml,
    Database,
    Settings,
    Trash2,
    Workflow
  } from 'lucide-svelte'
  import { BottomSheet } from '$lib/components/ui'
  import type { Scene } from '$lib/scenes/schema'
  import type { SceneDocumentsStore } from '$lib/stores/scenes/documents/types'
  import type {
    UpdateWorkflowInput,
    Workflow as CanvasWorkflow,
    WorkflowDefinition,
    WorkflowSettings
  } from '$lib/workflows/schema'
  import { isDatabaseFlowDefinition } from '$lib/workflows/database/definition'
  import { workflowDefinitionToYaml } from '$lib/workflows/definition'
  import MobileDatabaseGraph from '$lib/mobile/components/workflows/MobileDatabaseGraph.svelte'
  import MobileWorkflowGraph from '$lib/mobile/components/workflows/MobileWorkflowGraph.svelte'
  import MobileWorkflowSheet from '$lib/mobile/components/workflows/MobileWorkflowSheet.svelte'

  type SheetTab = 'overview' | 'code' | 'notes' | 'versions' | 'assistant'

  let {
    canvasId,
    workflow,
    scenes,
    sceneDocumentsStore,
    canEdit,
    canModify,
    onMinimize,
    onDelete,
    onPatchWorkflow,
    onPatchYaml,
    onPatchNotes,
    onPatchSettings
  } = $props<{
    canvasId: string
    workflow: CanvasWorkflow
    scenes: Scene[]
    sceneDocumentsStore: SceneDocumentsStore
    canEdit: boolean
    canModify: boolean
    onMinimize: () => void
    onDelete: (workflowId: string) => void
    onPatchWorkflow: (
      patch: UpdateWorkflowInput
    ) => Promise<CanvasWorkflow | null>
    onPatchYaml: (configYaml: string) => Promise<CanvasWorkflow | null>
    onPatchNotes: (notes: string) => Promise<CanvasWorkflow | null>
    onPatchSettings: (
      settings: WorkflowSettings
    ) => Promise<CanvasWorkflow | null>
  }>()

  let sheetTab = $state<SheetTab | null>(null)

  const isDatabase = $derived(isDatabaseFlowDefinition(workflow.definition))
  const countLabel = $derived.by(() => {
    if (isDatabaseFlowDefinition(workflow.definition)) {
      return `${workflow.definition.tables.length} tables`
    }
    return `${workflow.definition.steps.length} nodes`
  })

  function close() {
    onMinimize()
  }

  async function handleDefinitionChange(definition: WorkflowDefinition) {
    await onPatchWorkflow({
      definition,
      configYaml: workflowDefinitionToYaml(definition)
    })
  }
</script>

<BottomSheet
  open
  onOpenChange={(nextOpen) => {
    if (!nextOpen) close()
  }}
  title={`Workflow ${workflow.title}`}
  handleLabel="Drag down to close workflow"
>
  {#snippet header()}
    <header class="border-b border-border/70 px-4 pb-3">
      <div class="flex items-center gap-2">
        {#if isDatabase}
          <Database class="size-4 shrink-0 text-primary" aria-hidden="true" />
        {:else}
          <Workflow class="size-4 shrink-0 text-primary" aria-hidden="true" />
        {/if}
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-sm font-bold">{workflow.title}</h2>
          <p class="text-xs text-muted-foreground">{countLabel}</p>
        </div>
        {#if canModify}
          <button
            type="button"
            class="flex size-9 items-center justify-center rounded-full text-muted-foreground"
            onclick={() => onDelete(workflow.id)}
            aria-label="Delete workflow"
          >
            <Trash2 class="size-4" aria-hidden="true" />
          </button>
        {/if}
      </div>
    </header>
  {/snippet}

  <div class="min-h-0 flex-1 overflow-hidden">
    {#if isDatabase}
      <MobileDatabaseGraph
        {workflow}
        canEdit={canEdit && canModify}
        lockedLabel="Read-only"
        onDefinitionChange={handleDefinitionChange}
      />
    {:else}
      <MobileWorkflowGraph
        {workflow}
        canEdit={canEdit && canModify}
        lockedLabel="Read-only"
        onDefinitionChange={handleDefinitionChange}
      />
    {/if}
  </div>

  <nav
    class="shrink-0 border-t border-border/70 bg-card px-3 py-2"
    style="padding-bottom:max(0.5rem, env(safe-area-inset-bottom));"
    aria-label="Workflow actions"
  >
    <div class="grid grid-cols-3 gap-2">
      <button
        type="button"
        class="flex h-11 items-center justify-center gap-1 rounded-full bg-secondary text-xs font-bold"
        onclick={() => (sheetTab = 'overview')}
      >
        <Settings class="size-4" aria-hidden="true" />
        Details
      </button>
      <button
        type="button"
        class="flex h-11 items-center justify-center gap-1 rounded-full bg-secondary text-xs font-bold"
        onclick={() => (sheetTab = 'code')}
        disabled={!canEdit}
      >
        <CodeXml class="size-4" aria-hidden="true" />
        Code
      </button>
      <button
        type="button"
        class="flex h-11 items-center justify-center gap-1 rounded-full bg-secondary text-xs font-bold"
        onclick={() => (sheetTab = 'assistant')}
        disabled={!canEdit}
      >
        <Bot class="size-4" aria-hidden="true" />
        AI
      </button>
    </div>
  </nav>
</BottomSheet>

{#if sheetTab}
  <MobileWorkflowSheet
    {canvasId}
    {workflow}
    {scenes}
    {sceneDocumentsStore}
    {canModify}
    initialTab={sheetTab}
    onClose={() => (sheetTab = null)}
    {onPatchWorkflow}
    {onPatchYaml}
    {onPatchNotes}
    {onPatchSettings}
  />
{/if}
