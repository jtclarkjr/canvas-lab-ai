<script lang="ts">
  type ResizeHandlers = {
    resizePointerDown: (event: PointerEvent, workflowId: string) => void
    resizePointerMove: (event: PointerEvent, workflowId: string) => void
    resizePointerUp: (event: PointerEvent, workflowId: string) => void
    resizePointerCancel: (event: PointerEvent, workflowId: string) => void
  }

  let { workflowId, handlers } = $props<{
    workflowId: string
    handlers: ResizeHandlers
  }>()
</script>

<button
  type="button"
  class="absolute right-1.5 bottom-1.5 size-6 cursor-nwse-resize rounded-md border border-border/70 bg-background/85 text-muted-foreground shadow-sm backdrop-blur transition hover:border-primary/60 hover:text-primary"
  aria-label="Resize workflow"
  title="Resize workflow"
  onpointerdown={(event) => handlers.resizePointerDown(event, workflowId)}
  onpointermove={(event) => handlers.resizePointerMove(event, workflowId)}
  onpointerup={(event) => handlers.resizePointerUp(event, workflowId)}
  onpointercancel={(event) => handlers.resizePointerCancel(event, workflowId)}
>
  <span
    class="absolute right-1.5 bottom-1.5 size-2 border-r border-b border-current"
  ></span>
</button>
