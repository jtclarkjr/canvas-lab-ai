<script lang="ts">
  import { Handle, Position, useSvelteFlow } from '@xyflow/svelte'
  import {
    CircleCheck,
    CircleDot,
    Diamond,
    FileInput,
    FileOutput,
    StickyNote,
    Trash2
  } from 'lucide-svelte'
  import type {
    WorkflowFlowEdge,
    WorkflowFlowNode,
    WorkflowNodeData
  } from '#lib/workflows/types.js'

  let {
    id,
    data,
    selected = false,
    deletable = true
  } = $props<{
    id: string
    data: WorkflowNodeData
    selected?: boolean
    deletable?: boolean
  }>()

  const { deleteElements } = useSvelteFlow<WorkflowFlowNode, WorkflowFlowEdge>()

  const Icon = $derived.by(() => {
    switch (data.stepType) {
      case 'input':
        return FileInput
      case 'decision':
        return Diamond
      case 'output':
        return FileOutput
      case 'note':
        return StickyNote
      case 'task':
      default:
        return CircleCheck
    }
  })

  const typeLabel = $derived(data.stepType === 'task' ? 'step' : data.stepType)

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
  class={`relative min-w-[180px] rounded-md border bg-card px-3 py-2 shadow-sm transition ${
    selected
      ? 'border-primary ring-2 ring-primary/25'
      : 'border-border/80 hover:border-primary/50'
  }`}
>
  {#if selected && deletable}
    <button
      type="button"
      class="nodrag nopan absolute -top-2 -right-2 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:border-destructive/60 hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Delete ${data.label}`}
      title="Delete node"
      onpointerdown={stopGraphControlEvent}
      onclick={deleteNode}
    >
      <Trash2 class="size-3" aria-hidden="true" />
    </button>
  {/if}

  <Handle
    type="target"
    position={Position.Left}
    class="!size-2.5 !border-primary !bg-background"
  />
  <div class="flex items-center gap-2">
    <Icon class="size-4 shrink-0 text-primary" />
    <div class="min-w-0 flex-1">
      <div class="truncate text-[13px] font-semibold text-foreground">
        {data.label}
      </div>
      <div
        class="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground"
      >
        <CircleDot class="size-3" />
        {typeLabel}
      </div>
    </div>
  </div>

  {#if data.description || data.tool || data.actionKind !== 'none'}
    <div class="mt-2 space-y-1 text-[11px] leading-snug text-muted-foreground">
      {#if data.description}
        <p class="line-clamp-2">{data.description}</p>
      {/if}
      {#if data.tool}
        <p class="truncate">tool: {data.tool}</p>
      {/if}
      {#if data.actionKind !== 'none'}
        <p class="truncate">action: {data.actionKind}</p>
      {/if}
    </div>
  {/if}

  <Handle
    type="source"
    position={Position.Right}
    class="!size-2.5 !border-primary !bg-background"
  />
</div>
