<script lang="ts">
  import {
    Database,
    GripVertical,
    Maximize2,
    Trash2,
    Workflow
  } from 'lucide-svelte'
  import type { Camera } from '$lib/canvas/types'
  import type { Workflow as CanvasWorkflow } from '$lib/workflows/schema'
  import { isDatabaseFlowDefinition } from '$lib/workflows/database/definition'

  type FrameHandlers = {
    pointerDown: (event: PointerEvent, workflowId: string) => void
    pointerMove: (event: PointerEvent, workflowId: string) => void
    pointerUp: (
      event: PointerEvent,
      workflowId: string,
      options?: { focusOnClick?: boolean }
    ) => void
    pointerCancel: (event: PointerEvent, workflowId: string) => void
  }

  let { workflow, camera, interactive, canModify, handlers, onOpen, onDelete } =
    $props<{
      workflow: CanvasWorkflow
      camera: Camera
      interactive: boolean
      canModify: boolean
      handlers: FrameHandlers
      onOpen: (workflowId: string) => void
      onDelete: (workflowId: string) => void
    }>()

  const isDatabase = $derived(isDatabaseFlowDefinition(workflow.definition))
  const countLabel = $derived.by(() => {
    if (isDatabaseFlowDefinition(workflow.definition)) {
      return `${workflow.definition.tables.length} tables`
    }
    return `${workflow.definition.steps.length} nodes`
  })
  const cardStyle = $derived(
    `left:${camera.x + workflow.x * camera.scale}px;` +
      `top:${camera.y + workflow.y * camera.scale}px;` +
      `width:${workflow.width * camera.scale}px;` +
      `height:${workflow.height * camera.scale}px;` +
      `transform:rotate(${workflow.rotation}deg);` +
      'transform-origin:center;touch-action:none'
  )

  function dragDown(event: PointerEvent) {
    event.stopPropagation()
    handlers.pointerDown(event, workflow.id)
  }

  function dragMove(event: PointerEvent) {
    event.stopPropagation()
    handlers.pointerMove(event, workflow.id)
  }

  function dragUp(event: PointerEvent) {
    event.stopPropagation()
    handlers.pointerUp(event, workflow.id, { focusOnClick: false })
  }

  function dragCancel(event: PointerEvent) {
    event.stopPropagation()
    handlers.pointerCancel(event, workflow.id)
  }
</script>

<article
  class={`absolute flex overflow-hidden rounded-xl border border-border/70 bg-card/95 text-card-foreground shadow-xl backdrop-blur ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
  style={cardStyle}
  data-workflow-id={workflow.id}
>
  <button
    type="button"
    class="flex min-h-full w-full flex-col p-0 text-left"
    onclick={() => onOpen(workflow.id)}
    disabled={!interactive}
    aria-label={`Open workflow ${workflow.title}`}
  >
    <header
      class="flex h-12 shrink-0 items-center gap-2 border-b border-border/70 px-3"
    >
      {#if isDatabase}
        <Database class="size-4 shrink-0 text-primary" aria-hidden="true" />
      {:else}
        <Workflow class="size-4 shrink-0 text-primary" aria-hidden="true" />
      {/if}
      <span class="min-w-0 flex-1 truncate text-sm font-semibold">
        {workflow.title}
      </span>
      <span
        class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
      >
        {countLabel}
      </span>
    </header>

    <div class="min-h-0 flex-1 overflow-hidden px-3 py-2">
      {#if isDatabaseFlowDefinition(workflow.definition)}
        <div class="space-y-1.5">
          {#each workflow.definition.tables.slice(0, 4) as table (table.id)}
            <div class="truncate text-xs text-muted-foreground">
              <span class="font-semibold text-foreground">{table.name}</span>
              <span> · {table.columns.length} columns</span>
            </div>
          {/each}
        </div>
      {:else}
        <div class="space-y-1.5">
          {#each workflow.definition.steps.slice(0, 4) as step (step.id)}
            <div class="truncate text-xs text-muted-foreground">
              <span class="font-semibold text-foreground">{step.title}</span>
              <span> · {step.type}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </button>

  {#if interactive}
    <div class="absolute right-2 top-2 flex items-center gap-1">
      {#if canModify}
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm"
          onpointerdown={dragDown}
          onpointermove={dragMove}
          onpointerup={dragUp}
          onpointercancel={dragCancel}
          aria-label="Move workflow"
        >
          <GripVertical class="size-4" aria-hidden="true" />
        </button>
      {/if}
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm"
        onclick={(event) => {
          event.stopPropagation()
          onOpen(workflow.id)
        }}
        aria-label="Open workflow"
      >
        <Maximize2 class="size-4" aria-hidden="true" />
      </button>
      {#if canModify}
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm"
          onclick={(event) => {
            event.stopPropagation()
            onDelete(workflow.id)
          }}
          aria-label="Delete workflow"
        >
          <Trash2 class="size-4" aria-hidden="true" />
        </button>
      {/if}
    </div>
  {/if}
</article>
