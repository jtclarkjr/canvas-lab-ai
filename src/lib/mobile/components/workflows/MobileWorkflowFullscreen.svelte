<script lang="ts">
  import {
    Bot,
    CodeXml,
    Database,
    Minimize2,
    Settings,
    Trash2,
    Workflow
  } from 'lucide-svelte'
  import { cubicOut } from 'svelte/easing'
  import { scale } from 'svelte/transition'
  import type { Scene } from '$lib/scenes/schema'
  import type { SceneDocumentsStore } from '$lib/stores/scenes/documents.svelte'
  import type {
    UpdateWorkflowInput,
    Workflow as CanvasWorkflow,
    WorkflowSettings
  } from '$lib/workflows/schema'
  import { isDatabaseFlowDefinition } from '$lib/workflows/database/definition'
  import MobileWorkflowSheet from '$lib/mobile/components/workflows/MobileWorkflowSheet.svelte'
  import MobileWorkflowSummary from '$lib/mobile/components/workflows/MobileWorkflowSummary.svelte'

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
</script>

<div
  class="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground"
  role="dialog"
  aria-label={`Workflow ${workflow.title}`}
  transition:scale={{
    duration: 160,
    easing: cubicOut,
    opacity: 0.72,
    start: 0.985
  }}
  data-camera-exempt
>
  <header
    class="flex shrink-0 items-center gap-2 border-b border-border/70 bg-card px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
  >
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
    <button
      type="button"
      class="flex size-9 items-center justify-center rounded-full text-muted-foreground"
      onclick={onMinimize}
      aria-label="Minimize workflow"
    >
      <Minimize2 class="size-4" aria-hidden="true" />
    </button>
  </header>

  <div class="min-h-0 flex-1">
    <MobileWorkflowSummary {workflow} />
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
</div>

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
