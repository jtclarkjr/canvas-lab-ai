import {
  createScene as createSceneApi,
  deleteScene as deleteSceneApi,
  listScenes,
  updateScene as updateSceneApi
} from '$lib/scenes/api'
import { getSceneType } from '$lib/scenes/registry'
import type { Scene, UpdateSceneInput } from '$lib/scenes/schema'
import type { CanvasRole } from '$lib/canvas/roles'

const DRAG_THRESHOLD_PX = 5
const MIN_SCENE_WIDTH = 160
const MIN_SCENE_HEIGHT = 120
const MAX_SCENE_SIZE = 2000

type PendingCardDrag = {
  sceneId: string
  startClientX: number
  startClientY: number
  originX: number
  originY: number
  started: boolean
}

type PendingCardResize = {
  sceneId: string
  startClientX: number
  startClientY: number
  originWidth: number
  originHeight: number
}

type OpenScene = {
  sceneId: string
  originRect: DOMRect | null
}

type WorkspaceScenesInput = {
  getActiveCanvasId: () => string
  getUserId: () => string
  getRole: () => CanvasRole
  getRootElement: () => HTMLDivElement | null
  getCameraScale: () => number
  initialScenes?: Scene[]
  screenToCanvasPoint: (
    clientX: number,
    clientY: number
  ) => {
    x: number
    y: number
  }
}

export function createWorkspaceScenesStore({
  getActiveCanvasId,
  getUserId,
  getRole,
  getRootElement,
  getCameraScale,
  initialScenes,
  screenToCanvasPoint
}: WorkspaceScenesInput) {
  let scenes = $state<Scene[]>(initialScenes ?? [])
  let isLoading = $state(false)
  let isCreatingScene = $state(false)
  let error = $state<string | null>(null)
  let openScene = $state<OpenScene | null>(null)
  let draggingSceneId = $state<string | null>(null)
  let resizingSceneId = $state<string | null>(null)
  let transformBusySceneIds = $state<Record<string, true>>({})
  // Bumped by realtime document events so open viewers refetch.
  let documentRevisions = $state<Record<string, number>>({})

  let pendingDrag: PendingCardDrag | null = null
  let pendingResize: PendingCardResize | null = null
  let lastLoadedCanvasId = ''

  function setScenes(next: Scene[] | ((previous: Scene[]) => Scene[])) {
    scenes = typeof next === 'function' ? next(scenes) : next
  }

  function getScene(id: string) {
    return scenes.find((scene) => scene.id === id) ?? null
  }

  function canModifyScene(id: string) {
    const role = getRole()
    if (role === 'owner' || role === 'admin') {
      return true
    }
    return role === 'editor' && getScene(id)?.createdBy === getUserId()
  }

  async function loadScenes(canvasId: string) {
    if (!canvasId || canvasId === lastLoadedCanvasId) {
      return
    }

    lastLoadedCanvasId = canvasId
    isLoading = true
    error = null

    try {
      const response = await listScenes(canvasId)
      scenes = response.items
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Failed to load scenes.'
    } finally {
      isLoading = false
    }
  }

  async function reloadScenes() {
    lastLoadedCanvasId = ''
    await loadScenes(getActiveCanvasId())
  }

  async function createSceneAtViewportCenter(type: string) {
    const canvasId = getActiveCanvasId()
    const rootEl = getRootElement()
    if (!canvasId || !rootEl) {
      return null
    }

    // Latch: rapid clicks on "New scene" must create exactly one card.
    if (isCreatingScene) {
      return null
    }
    isCreatingScene = true

    const sceneType = getSceneType(type)
    const size = sceneType?.defaultSize ?? { width: 320, height: 200 }
    const rect = rootEl.getBoundingClientRect()
    const center = screenToCanvasPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    )

    try {
      const response = await createSceneApi(canvasId, {
        type,
        x: center.x - size.width / 2,
        y: center.y - size.height / 2
      })

      setScenes((previous) => {
        if (previous.some((scene) => scene.id === response.item.id)) {
          return previous
        }
        return [...previous, response.item]
      })

      // Open the fresh scene right away; no origin rect yet, so the dialog
      // falls back to a centered fade-in instead of a card FLIP.
      openScene = { sceneId: response.item.id, originRect: null }
      return response.item
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Failed to create scene.'
      return null
    } finally {
      isCreatingScene = false
    }
  }

  function persistScenePatch(
    sceneId: string,
    patch: Partial<Pick<Scene, 'x' | 'y' | 'width' | 'height' | 'rotation'>>
  ) {
    const canvasId = getActiveCanvasId()
    if (!canvasId) {
      return
    }

    void updateSceneApi(canvasId, sceneId, patch).catch((cause) => {
      error = cause instanceof Error ? cause.message : 'Failed to save scene.'
      void reloadScenes()
    })
  }

  async function patchScene(sceneId: string, patch: UpdateSceneInput) {
    const canvasId = getActiveCanvasId()
    if (!canvasId) {
      return
    }

    setScenes((previous) =>
      previous.map((scene) =>
        scene.id === sceneId ? { ...scene, ...patch } : scene
      )
    )

    try {
      await updateSceneApi(canvasId, sceneId, patch)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Failed to save scene.'
      void reloadScenes()
    }
  }

  async function deleteScene(sceneId: string) {
    const canvasId = getActiveCanvasId()
    if (!canvasId) {
      return
    }

    const previousScenes = scenes
    setScenes((previous) => previous.filter((scene) => scene.id !== sceneId))
    if (openScene?.sceneId === sceneId) {
      openScene = null
    }

    try {
      await deleteSceneApi(canvasId, sceneId)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Failed to delete scene.'
      scenes = previousScenes
    }
  }

  // card drag (move)

  function handleCardPointerDown(event: PointerEvent, sceneId: string) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    // Ignore interactive *descendants* (buttons inside the card) — the card
    // itself carries role="button", so it must not match its own guard.
    const interactive = (event.target as Element).closest(
      'button, a, input, textarea, [role="button"]'
    )
    if (interactive && interactive !== event.currentTarget) {
      return
    }

    event.stopPropagation()
    if (event.pointerType !== 'mouse') {
      event.preventDefault()
    }

    const scene = getScene(sceneId)
    if (!scene) return
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    pendingDrag = {
      sceneId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: scene.x,
      originY: scene.y,
      started: false
    }
  }

  function handleCardPointerMove(event: PointerEvent, sceneId: string) {
    if (!pendingDrag || pendingDrag.sceneId !== sceneId) return
    event.stopPropagation()

    const dx = event.clientX - pendingDrag.startClientX
    const dy = event.clientY - pendingDrag.startClientY

    if (!pendingDrag.started) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
        return
      }
      if (!canModifyScene(sceneId)) {
        return
      }
      pendingDrag.started = true
      draggingSceneId = sceneId
    }

    const scale = getCameraScale()
    const nextX = pendingDrag.originX + dx / scale
    const nextY = pendingDrag.originY + dy / scale

    setScenes((previous) =>
      previous.map((scene) =>
        scene.id === sceneId ? { ...scene, x: nextX, y: nextY } : scene
      )
    )
  }

  function handleCardPointerUp(event: PointerEvent, sceneId: string) {
    if (!pendingDrag || pendingDrag.sceneId !== sceneId) return
    event.stopPropagation()

    const cardEl = event.currentTarget as HTMLElement
    if (cardEl.hasPointerCapture(event.pointerId)) {
      cardEl.releasePointerCapture(event.pointerId)
    }

    const wasDrag = pendingDrag.started
    pendingDrag = null
    draggingSceneId = null

    if (wasDrag) {
      const scene = getScene(sceneId)
      if (scene) {
        persistScenePatch(sceneId, { x: scene.x, y: scene.y })
      }
    }
    // Single click does nothing — opening is a double-click (or Enter),
    // so clicks and drags never fight each other.
  }

  // Expands the scene: double-click / Enter on the card, or a click on the
  // card's maximize button — the FLIP origin is always the card rect.
  function handleCardOpen(event: Event, sceneId: string) {
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const cardEl = (target.closest('[data-scene-id]') as HTMLElement) ?? target
    openScene = { sceneId, originRect: cardEl.getBoundingClientRect() }
  }

  function handleCardPointerCancel(event: PointerEvent, sceneId: string) {
    if (!pendingDrag || pendingDrag.sceneId !== sceneId) return
    event.stopPropagation()
    pendingDrag = null
    draggingSceneId = null
  }

  // card resize

  function handleResizePointerDown(event: PointerEvent, sceneId: string) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (!canModifyScene(sceneId)) return

    event.stopPropagation()
    event.preventDefault()

    const scene = getScene(sceneId)
    if (!scene) return
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    pendingResize = {
      sceneId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originWidth: scene.width,
      originHeight: scene.height
    }
    resizingSceneId = sceneId
  }

  function handleResizePointerMove(event: PointerEvent, sceneId: string) {
    if (!pendingResize || pendingResize.sceneId !== sceneId) return
    event.stopPropagation()

    const scale = getCameraScale()
    const dx = (event.clientX - pendingResize.startClientX) / scale
    const dy = (event.clientY - pendingResize.startClientY) / scale

    const nextWidth = Math.min(
      Math.max(pendingResize.originWidth + dx, MIN_SCENE_WIDTH),
      MAX_SCENE_SIZE
    )
    const nextHeight = Math.min(
      Math.max(pendingResize.originHeight + dy, MIN_SCENE_HEIGHT),
      MAX_SCENE_SIZE
    )

    setScenes((previous) =>
      previous.map((scene) =>
        scene.id === sceneId
          ? { ...scene, width: nextWidth, height: nextHeight }
          : scene
      )
    )
  }

  function handleResizePointerUp(event: PointerEvent, sceneId: string) {
    if (!pendingResize || pendingResize.sceneId !== sceneId) return
    event.stopPropagation()

    const handleEl = event.currentTarget as HTMLElement
    if (handleEl.hasPointerCapture(event.pointerId)) {
      handleEl.releasePointerCapture(event.pointerId)
    }

    pendingResize = null
    resizingSceneId = null

    const scene = getScene(sceneId)
    if (scene) {
      persistScenePatch(sceneId, { width: scene.width, height: scene.height })
    }
  }

  function handleResizePointerCancel(event: PointerEvent, sceneId: string) {
    if (!pendingResize || pendingResize.sceneId !== sceneId) return
    event.stopPropagation()
    pendingResize = null
    resizingSceneId = null
  }

  // open/close + realtime hooks

  function openSceneById(sceneId: string, originRect: DOMRect | null) {
    openScene = { sceneId, originRect }
  }

  function closeScene() {
    openScene = null
  }

  function handleSceneDeletedRemotely(sceneId: string) {
    if (openScene?.sceneId === sceneId) {
      openScene = null
    }
  }

  function bumpDocumentRevision(sceneId: string) {
    documentRevisions = {
      ...documentRevisions,
      [sceneId]: (documentRevisions[sceneId] ?? 0) + 1
    }
  }

  function isSceneBusy(sceneId: string) {
    return (
      draggingSceneId === sceneId ||
      resizingSceneId === sceneId ||
      transformBusySceneIds[sceneId] === true
    )
  }

  function setTransformBusyScenes(sceneIds: string[]) {
    transformBusySceneIds = Object.fromEntries(
      sceneIds.map((sceneId) => [sceneId, true])
    )
  }

  return {
    loadScenes,
    createSceneAtViewportCenter,
    patchScene,
    deleteScene,
    canModifyScene,
    persistScenePatch,
    setScenes,
    getScene,
    handleCardPointerDown,
    handleCardPointerMove,
    handleCardPointerUp,
    handleCardPointerCancel,
    handleCardOpen,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    handleResizePointerCancel,
    openSceneById,
    closeScene,
    handleSceneDeletedRemotely,
    bumpDocumentRevision,
    isSceneBusy,
    setTransformBusyScenes,
    get scenes() {
      return scenes
    },
    get isLoading() {
      return isLoading
    },
    get isCreatingScene() {
      return isCreatingScene
    },
    get error() {
      return error
    },
    get openScene() {
      return openScene
    },
    get draggingSceneId() {
      return draggingSceneId
    },
    get documentRevisions() {
      return documentRevisions
    }
  }
}
