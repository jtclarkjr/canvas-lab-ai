<script lang="ts">
  import { Handle, Position, useSvelteFlow } from '@xyflow/svelte'
  import { KeyRound, Table2, Trash2 } from 'lucide-svelte'
  import { databaseColumnHandleId } from '#lib/workflows/database/definition.js'
  import type {
    DatabaseFlowEdge,
    DatabaseFlowNode,
    DatabaseTableNodeData
  } from '#lib/workflows/database/types.js'

  let {
    id,
    data,
    selected = false,
    deletable = true
  } = $props<{
    id: string
    data: DatabaseTableNodeData
    selected?: boolean
    deletable?: boolean
  }>()

  const { deleteElements } = useSvelteFlow<DatabaseFlowNode, DatabaseFlowEdge>()

  const table = $derived(data.table)
  const handleClass =
    'mobile-database-column-handle !size-3 !border-primary !bg-background opacity-0 transition-opacity'

  function stopGraphControlEvent(event: Event) {
    event.stopPropagation()
  }

  async function deleteNode(event: MouseEvent) {
    stopGraphControlEvent(event)
    event.preventDefault()
    await deleteElements({ nodes: [{ id }] })
  }
</script>

<div
  class={`relative min-w-[230px] max-w-[280px] overflow-visible rounded-xl border bg-card shadow-lg transition ${
    selected
      ? 'border-primary ring-2 ring-primary/30'
      : 'border-border/80 hover:border-primary/50'
  }`}
>
  {#if selected && deletable}
    <button
      type="button"
      class="nodrag nopan absolute -top-2 -right-2 z-10 flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:border-destructive/60 hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Delete ${table.name}`}
      title="Delete table"
      onpointerdown={stopGraphControlEvent}
      onclick={deleteNode}
    >
      <Trash2 class="size-3.5" aria-hidden="true" />
    </button>
  {/if}

  <div class="flex items-center gap-2 border-b border-border/70 px-3 py-2">
    <Table2 class="size-4 shrink-0 text-primary" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <div class="truncate text-[13px] font-semibold text-foreground">
        {table.schema}.{table.name}
      </div>
      <div class="text-[10px] uppercase text-muted-foreground">
        {table.columns.length} columns
      </div>
    </div>
  </div>

  <div class="divide-y divide-border/50">
    {#each table.columns as column (column.id)}
      <div class="relative flex min-h-9 items-center gap-2 px-3 py-1.5 text-xs">
        <Handle
          id={databaseColumnHandleId('target', column.id)}
          type="target"
          position={Position.Left}
          class={handleClass}
        />
        <div class="flex min-w-0 flex-1 items-center gap-1.5">
          {#if column.primaryKey}
            <KeyRound
              class="size-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
          {/if}
          <span class="min-w-0 truncate font-medium text-foreground">
            {column.name}
          </span>
          {#if !column.nullable}
            <span class="shrink-0 text-[10px] text-muted-foreground">NN</span>
          {/if}
          {#if column.unique && !column.primaryKey}
            <span class="shrink-0 text-[10px] text-muted-foreground">UQ</span>
          {/if}
          {#if column.identity}
            <span class="shrink-0 text-[10px] text-muted-foreground">ID</span>
          {/if}
        </div>
        <span
          class="max-w-20 shrink-0 truncate text-[11px] text-muted-foreground"
        >
          {column.dataType}
        </span>
        <Handle
          id={databaseColumnHandleId('source', column.id)}
          type="source"
          position={Position.Right}
          class={handleClass}
        />
      </div>
    {:else}
      <div class="px-3 py-3 text-xs text-muted-foreground">No columns</div>
    {/each}
  </div>
</div>

<style>
  :global(.mobile-database-graph.is-connecting .mobile-database-column-handle),
  :global(.mobile-database-column-handle.connectingfrom),
  :global(.mobile-database-column-handle.connectingto) {
    opacity: 1;
  }
</style>
