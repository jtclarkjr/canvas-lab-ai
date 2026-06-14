<script lang="ts">
  import { MousePointer2, UserRound } from 'lucide-svelte'
  import { canvasToScreen } from '$lib/canvas/drawing-utils'
  import type { Camera, Point } from '$lib/canvas/types'
  import type { CursorEventPayload } from '$lib/workspace/types'
  import { getWorkspaceAvatarInitials } from '$lib/workspace/presence-identity'

  let { cursors, camera } = $props<{
    cursors: Record<string, CursorEventPayload>
    camera: Camera
  }>()

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
            title={cursor.user.name}
          >
            {#if cursor.user.isAnonymous}
              <UserRound class="size-4" aria-label="Guest viewer" />
            {:else}
              {getWorkspaceAvatarInitials(cursor.user.name)}
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>
