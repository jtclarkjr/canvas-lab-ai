<script lang="ts">
  import { MousePointer2 } from 'lucide-svelte'
  import { canvasToScreen } from '$lib/canvas/drawing-utils'
  import type { Camera, CursorEventPayload, Point } from '$lib/canvas/types'

  let { cursors, camera } = $props<{
    cursors: Record<string, CursorEventPayload>
    camera: Camera
  }>()

  function getInitials(name: string) {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
    }

    return name.slice(0, 2).toUpperCase()
  }

  function cursorEntries() {
    return Object.entries(cursors) as Array<[string, CursorEventPayload]>
  }

  function getCursorScreenPosition(cursor: CursorEventPayload): Point {
    return cursor.coordinateSpace === 'canvas'
      ? canvasToScreen(cursor.position, camera)
      : cursor.position
  }

  function getCursorStyle(cursor: CursorEventPayload) {
    const position = getCursorScreenPosition(cursor)
    return `left:${position.x}px;top:${position.y}px;transform:translateX(-2px) translateY(-2px)`
  }
</script>

<!-- z-20: cursors point at canvas content, so they sit above the canvas
     and scene cards (z-10) but below UI chrome — toolbars (z-30), the chat
     window (z-40), and dialogs (z-50). -->
<div class="pointer-events-none absolute inset-0 z-20">
  <div class="absolute inset-0">
    {#each cursorEntries() as [id, cursor] (id)}
      <div class="absolute" style={getCursorStyle(cursor)}>
        <div class="relative">
          <MousePointer2
            aria-label="User cursor"
            fill={cursor.color}
            size={24}
            stroke={cursor.color}
            strokeWidth={1.5}
          />

          <div
            class="absolute left-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background/80 text-xs font-semibold shadow-lg"
            style={`background-color:${cursor.color};color:var(--canvas-avatar-foreground)`}
          >
            {getInitials(cursor.user.name)}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>
