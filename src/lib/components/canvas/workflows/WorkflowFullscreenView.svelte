<script lang="ts">
  import { Database, GitBranch, Minimize2, Trash2 } from 'lucide-svelte'
  import { cubicOut } from 'svelte/easing'
  import { scale } from 'svelte/transition'
  import type { Workflow, WorkflowDefinition } from '#lib/workflows/schema.js'
  import { isDatabaseFlowDefinition } from '#lib/workflows/database/definition.js'
  import DatabaseGraph from '#lib/components/canvas/workflows/database/DatabaseGraph.svelte'
  import WorkflowGraph from '#lib/components/canvas/workflows/WorkflowGraph.svelte'
  import WorkflowTitleEditor from '#lib/components/canvas/workflows/WorkflowTitleEditor.svelte'

  let {
    workflow,
    canEdit,
    canModify,
    onMinimize,
    onDelete,
    onRename,
    onDefinitionChange
  } = $props<{
    workflow: Workflow
    canEdit: boolean
    canModify: boolean
    onMinimize: () => void
    onDelete: (workflowId: string) => void
    onRename: (workflowId: string, title: string) => void | Promise<void>
    onDefinitionChange: (definition: WorkflowDefinition) => void | Promise<void>
  }>()

  const isDatabase = $derived(isDatabaseFlowDefinition(workflow.definition))
  const countLabel = $derived.by(() => {
    if (isDatabaseFlowDefinition(workflow.definition)) {
      return `${workflow.definition.tables.length} tables`
    }
    return `${workflow.definition.steps.length} nodes`
  })
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="pointer-events-auto fixed inset-0 z-[45] flex flex-col bg-background/95 shadow-2xl backdrop-blur-sm"
  role="dialog"
  aria-label={`Fullscreen workflow ${workflow.title}`}
  tabindex="-1"
  onpointerdown={(event) => event.stopPropagation()}
  onkeydown={(event) => {
    event.stopPropagation()
    if (event.key === 'Escape') {
      onMinimize()
    }
  }}
  transition:scale={{
    duration: 160,
    easing: cubicOut,
    opacity: 0.72,
    start: 0.985
  }}
>
  <header
    class="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-card/95 px-4"
  >
    {#if isDatabase}
      <Database class="size-4 shrink-0 text-primary" />
    {:else}
      <GitBranch class="size-4 shrink-0 text-primary" />
    {/if}
    <div class="group/title flex min-w-0 flex-1 items-center gap-1">
      <WorkflowTitleEditor
        title={workflow.title}
        {canModify}
        buttonClassName="group-hover/title:flex"
        onSave={(title) => onRename(workflow.id, title)}
      />
    </div>
    <span
      class="rounded bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground"
    >
      {countLabel}
    </span>
    {#if canModify}
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
        onclick={() => onDelete(workflow.id)}
        aria-label="Delete workflow"
        title="Delete workflow"
      >
        <Trash2 class="size-4" aria-hidden="true" />
      </button>
    {/if}
    <button
      type="button"
      class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      onclick={onMinimize}
      aria-label="Minimize workflow"
      title="Minimize workflow"
    >
      <Minimize2 class="size-4" aria-hidden="true" />
    </button>
  </header>

  <div class="min-h-0 flex-1 overflow-hidden">
    {#if isDatabase}
      <DatabaseGraph
        {workflow}
        canEdit={canEdit && canModify}
        lockedLabel="Read-only"
        {onDefinitionChange}
      />
    {:else}
      <WorkflowGraph
        {workflow}
        canEdit={canEdit && canModify}
        lockedLabel="Read-only"
        {onDefinitionChange}
      />
    {/if}
  </div>
</div>
