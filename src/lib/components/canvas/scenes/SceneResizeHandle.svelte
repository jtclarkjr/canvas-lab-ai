<script lang="ts">
  let { sceneId, handlers } = $props<{
    sceneId: string
    handlers: {
      resizePointerDown: (event: PointerEvent, sceneId: string) => void
      resizePointerMove: (event: PointerEvent, sceneId: string) => void
      resizePointerUp: (event: PointerEvent, sceneId: string) => void
      resizePointerCancel: (event: PointerEvent, sceneId: string) => void
    }
  }>()
</script>

<div
  class="absolute -bottom-0.5 -right-0.5 h-4 w-4 cursor-se-resize rounded-tl-md rounded-br-[1rem] border-b border-r border-border/70 bg-primary/20 transition hover:bg-primary/50"
  role="presentation"
  aria-hidden="true"
  onpointerdown={(event) => handlers.resizePointerDown(event, sceneId)}
  onpointermove={(event) => handlers.resizePointerMove(event, sceneId)}
  onpointerup={(event) => handlers.resizePointerUp(event, sceneId)}
  onpointercancel={(event) => handlers.resizePointerCancel(event, sceneId)}
></div>
