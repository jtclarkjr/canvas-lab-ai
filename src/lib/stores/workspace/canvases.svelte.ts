import { invalidate } from '$app/navigation'
import { listCanvases } from '$lib/canvas/api'
import { updateCanvas } from '$lib/workspace/api'
import { CANVASES_DEPENDENCY } from '$lib/canvas/dependencies'
import { broadcastCanvasVisibilityChange } from '$lib/workspace/canvas-visibility-realtime'
import type { Canvas, CanvasVisibility } from '$lib/canvas/schema'

type WorkspaceCanvasesInput = {
  getActiveCanvasId: () => string
  getFallbackTitle?: () => string
  initialCanvases?: Canvas[]
}

export function createWorkspaceCanvasesStore({
  getActiveCanvasId,
  getFallbackTitle,
  initialCanvases
}: WorkspaceCanvasesInput) {
  let canvases = $state<Canvas[]>(initialCanvases ?? [])
  let error = $state<string | null>(null)
  let isLoading = $state(false)
  let hasLoadedCanvases = $state(initialCanvases !== undefined)

  function currentCanvas() {
    return canvases.find((canvas) => canvas.id === getActiveCanvasId()) ?? null
  }

  function setError(message: string | null) {
    error = message
  }

  function setCanvases(nextCanvases: Canvas[] | undefined) {
    if (nextCanvases === undefined) {
      return
    }

    canvases = nextCanvases
    hasLoadedCanvases = true
  }

  async function loadCanvasesList({ force = false }: { force?: boolean } = {}) {
    if (hasLoadedCanvases && !force) {
      return
    }

    isLoading = true
    error = null

    try {
      const response = await listCanvases()
      canvases = response.items
      hasLoadedCanvases = true
    } catch (loadError) {
      error =
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load canvases.'
    } finally {
      isLoading = false
    }
  }

  async function saveTitle(title: string) {
    const canvas = currentCanvas()
    if (!canvas || !title.trim()) {
      return
    }

    try {
      const response = await updateCanvas(canvas.id, {
        title: title.trim()
      })
      canvases = canvases.map((entry) =>
        entry.id === canvas.id ? response.item : entry
      )
      void invalidate(CANVASES_DEPENDENCY)
    } catch (saveError) {
      error =
        saveError instanceof Error
          ? saveError.message
          : 'Failed to update title.'
    }
  }

  async function saveVisibility(visibility: CanvasVisibility) {
    const canvas = currentCanvas()
    if (!canvas) {
      return
    }

    const response = await updateCanvas(canvas.id, { visibility })
    canvases = canvases.map((entry) =>
      entry.id === canvas.id ? response.item : entry
    )
    void broadcastCanvasVisibilityChange(
      canvas.id,
      response.item.visibility
    ).catch(() => {
      // The database update is authoritative; realtime broadcast is best-effort.
    })
    void invalidate(CANVASES_DEPENDENCY)
  }

  return {
    loadCanvasesList,
    saveTitle,
    saveVisibility,
    setCanvases,
    setError,
    get canvases() {
      return canvases
    },
    get currentCanvasTitle() {
      return currentCanvas()?.title ?? getFallbackTitle?.() ?? ''
    },
    get currentCanvasVisibility() {
      return currentCanvas()?.visibility ?? 'private'
    },
    get error() {
      return error
    },
    get isLoading() {
      return isLoading
    }
  }
}
