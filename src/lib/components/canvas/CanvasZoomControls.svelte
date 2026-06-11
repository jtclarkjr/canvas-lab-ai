<script lang="ts">
  import type { Camera } from '$lib/canvas/types'

  let { camera, onZoomIn, onZoomOut, onReset } = $props<{
    camera: Camera
    onZoomIn: () => void
    onZoomOut: () => void
    onReset: () => void
  }>()
</script>

<div class="pointer-events-auto fixed bottom-6 right-6 z-30 flex flex-col gap-2">
  <button
    type="button"
    class="toolbar-pill flex h-10 w-10 items-center justify-center transition hover:border-slate-700 hover:bg-slate-900"
    onclick={onZoomIn}
    title="Zoom in"
  >
    +
  </button>
  <button
    type="button"
    class="toolbar-pill flex h-10 w-10 items-center justify-center transition hover:border-slate-700 hover:bg-slate-900"
    onclick={onZoomOut}
    title="Zoom out"
  >
    -
  </button>
  <button
    type="button"
    class="toolbar-pill flex h-10 w-10 items-center justify-center text-[11px] font-semibold transition hover:border-slate-700 hover:bg-slate-900"
    onclick={onReset}
    title="Reset view"
  >
    {Math.round(camera.scale * 100)}%
  </button>
</div>
