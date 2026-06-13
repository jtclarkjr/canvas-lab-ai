<script lang="ts">
  import { FileCode2, GitBranch, Maximize2, Trash2 } from 'lucide-svelte'
  import type { Camera } from '$lib/canvas/types'
  import type { Workflow, WorkflowDefinition } from '$lib/workflows/schema'
  import WorkflowGraph from '$lib/components/canvas/workflows/WorkflowGraph.svelte'
  import WorkflowResizeHandle from '$lib/components/canvas/workflows/WorkflowResizeHandle.svelte'

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
    workflow,
    camera,
    focused,
    canModify,
    interactive,
    handlers,
    onFocus,
    onDelete,
    onDefinitionChange
  } = $props<{
    workflow: Workflow
    camera: Camera
    focused: boolean
    canModify: boolean
    interactive: boolean
    handlers: FrameHandlers
    onFocus: (workflowId: string) => void
    onDelete: (workflowId: string) => void
    onDefinitionChange: (definition: WorkflowDefinition) => void | Promise<void>
  }>()

  const frameStyle = $derived(
    `left:${camera.x + workflow.x * camera.scale}px;` +
      `top:${camera.y + workflow.y * camera.scale}px;` +
      `width:${workflow.width * camera.scale}px;` +
      `height:${workflow.height * camera.scale}px;` +
      `transform:rotate(${workflow.rotation}deg);` +
      'transform-origin:center;touch-action:none'
  )

  const steps = $derived(workflow.definition.steps)
</script>

<div
  class={`glass-card group absolute flex overflow-hidden p-0 transition-shadow ${
    interactive ? 'pointer-events-auto' : 'pointer-events-none'
  } ${focused ? 'ring-2 ring-primary/50' : ''}`}
  style={frameStyle}
  data-workflow-id={workflow.id}
  role="button"
  tabindex="0"
  title="Focus workflow"
  aria-label={`Focus workflow ${workflow.title}`}
  onpointerdown={(event) => handlers.pointerDown(event, workflow.id)}
  onpointermove={(event) => handlers.pointerMove(event, workflow.id)}
  onpointerup={(event) => handlers.pointerUp(event, workflow.id)}
  onpointercancel={(event) => handlers.pointerCancel(event, workflow.id)}
  ondblclick={() => onFocus(workflow.id)}
  onkeydown={(event) => {
    if (event.key === 'Enter') onFocus(workflow.id)
  }}
>
  <div class="flex min-h-0 w-full flex-col bg-card/90">
    <div
      class="flex h-10 shrink-0 items-center gap-2 border-b border-border/70 px-3"
    >
      <GitBranch class="size-4 shrink-0 text-primary" />
      <span
        class="min-w-0 flex-1 truncate text-sm font-semibold text-foreground"
      >
        {workflow.title}
      </span>
      <span
        class="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
      >
        {steps.length} nodes
      </span>
      {#if interactive}
        <button
          type="button"
          class="hidden size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-primary/10 hover:text-primary group-hover:flex"
          onclick={(event) => {
            event.stopPropagation()
            onFocus(workflow.id)
          }}
          aria-label="Focus workflow"
          title="Focus workflow"
        >
          <Maximize2 class="size-3.5" />
        </button>
        {#if canModify}
          <button
            type="button"
            class="hidden size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive group-hover:flex"
            onclick={(event) => {
              event.stopPropagation()
              onDelete(workflow.id)
            }}
            aria-label="Delete workflow"
            title="Delete workflow"
          >
            <Trash2 class="size-3.5" />
          </button>
        {/if}
      {/if}
    </div>

    <div class="min-h-0 flex-1">
      {#if focused}
        <WorkflowGraph
          {workflow}
          canEdit={interactive && canModify}
          {onDefinitionChange}
        />
      {:else}
        <div class="flex h-full flex-col gap-2 overflow-hidden p-3">
          {#if steps.length}
            <div class="grid flex-1 auto-rows-min gap-2 overflow-hidden">
              {#each steps.slice(0, 5) as step (step.id)}
                <div
                  class="flex min-w-0 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-2 py-1.5 text-xs"
                >
                  <FileCode2 class="size-3.5 shrink-0 text-muted-foreground" />
                  <span
                    class="min-w-0 flex-1 truncate font-medium text-foreground"
                  >
                    {step.title}
                  </span>
                  <span class="shrink-0 text-[10px] text-muted-foreground">
                    {step.type}
                  </span>
                </div>
              {/each}
            </div>
          {:else}
            <div
              class="flex h-full items-center justify-center text-xs text-muted-foreground"
            >
              Empty workflow
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  {#if interactive && canModify}
    <WorkflowResizeHandle workflowId={workflow.id} {handlers} />
  {/if}
</div>
