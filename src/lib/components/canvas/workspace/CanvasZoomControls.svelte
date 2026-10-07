<script lang="ts">
  import type { Camera } from '#lib/canvas/types.js'

  let { camera, onZoomIn, onZoomOut, onReset } = $props<{
    camera: Camera
    onZoomIn: () => void
    onZoomOut: () => void
    onReset: () => void
  }>()
</script>

<div
  class="pointer-events-auto fixed bottom-6 right-6 z-30 flex flex-col gap-2"
>
  <button
    type="button"
    class="toolbar-pill toolbar-button"
    onclick={onZoomIn}
    aria-label="Zoom in"
  >
    +
  </button>
  <button
    type="button"
    class="toolbar-pill toolbar-button"
    onclick={onZoomOut}
    aria-label="Zoom out"
  >
    -
  </button>
  <button
    type="button"
    class="toolbar-pill toolbar-button text-[11px] font-semibold"
    onclick={onReset}
    aria-label={`Reset zoom (currently ${Math.round(camera.scale * 100)}%)`}
  >
    {Math.round(camera.scale * 100)}%
  </button>
</div>
