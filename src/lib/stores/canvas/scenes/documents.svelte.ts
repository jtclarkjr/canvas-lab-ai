import { browser } from '$app/environment'
import { invalidate } from '$app/navigation'
import { getContext, setContext } from 'svelte'
import { sceneDocumentsDependency } from '$lib/canvas/dependencies'
import { getSceneDocument, listSceneDocumentItems } from '$lib/scenes/api'
import { sceneDocumentToListItem } from '$lib/scenes/mapping'
import type {
  SceneDocument,
  SceneDocumentListItem
} from '$lib/scenes/schema'

const SCENE_DOCUMENTS_CONTEXT = Symbol('scene-documents-store')
const REVALIDATE_DEBOUNCE_MS = 250

type SceneDocumentListsBySceneId = Record<string, SceneDocumentListItem[]>

type SceneDocumentsStoreInput = {
  canvasId: string
  initialItemsBySceneId?: SceneDocumentListsBySceneId
}

function sortDocumentItems(items: SceneDocumentListItem[]) {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function normalizeItemsBySceneId(
  itemsBySceneId: SceneDocumentListsBySceneId = {}
) {
  return Object.fromEntries(
    Object.entries(itemsBySceneId).map(([sceneId, items]) => [
      sceneId,
      sortDocumentItems(items)
    ])
  )
}

function createSceneDocumentsStore({
  canvasId: initialCanvasId,
  initialItemsBySceneId
}: SceneDocumentsStoreInput) {
  let canvasId = $state(initialCanvasId)
  let itemsBySceneId = $state<SceneDocumentListsBySceneId>(
    normalizeItemsBySceneId(initialItemsBySceneId)
  )
  let fullDocumentsById = $state<Record<string, SceneDocument>>({})
  const pendingRefreshes = new Map<string, Promise<void>>()
  let revalidateTimer: ReturnType<typeof setTimeout> | null = null

  function setCanvas(
    nextCanvasId: string,
    nextItemsBySceneId: SceneDocumentListsBySceneId = {}
  ) {
    const canvasChanged = canvasId !== nextCanvasId
    canvasId = nextCanvasId
    itemsBySceneId = normalizeItemsBySceneId(nextItemsBySceneId)

    if (canvasChanged) {
      pendingRefreshes.clear()
      fullDocumentsById = {}
    }
  }

  function getItems(sceneId: string) {
    return itemsBySceneId[sceneId] ?? []
  }

  function getFullDocument(documentId: string) {
    return fullDocumentsById[documentId] ?? null
  }

  function upsertItem(item: SceneDocumentListItem) {
    const current = itemsBySceneId[item.sceneId] ?? []
    itemsBySceneId = {
      ...itemsBySceneId,
      [item.sceneId]: sortDocumentItems([
        item,
        ...current.filter((entry) => entry.id !== item.id)
      ])
    }
  }

  function upsertFromFullDocument(document: SceneDocument) {
    fullDocumentsById = {
      ...fullDocumentsById,
      [document.id]: document
    }
    upsertItem(sceneDocumentToListItem(document))
  }

  function removeDocument(sceneId: string, documentId: string) {
    const { [documentId]: _removed, ...remaining } = fullDocumentsById
    fullDocumentsById = remaining
    itemsBySceneId = {
      ...itemsBySceneId,
      [sceneId]: (itemsBySceneId[sceneId] ?? []).filter(
        (entry) => entry.id !== documentId
      )
    }
  }

  async function refreshScene(sceneId: string) {
    const refreshKey = `${canvasId}:${sceneId}`
    const pending = pendingRefreshes.get(refreshKey)
    if (pending) {
      return pending
    }

    const refresh = (async () => {
      const activeCanvasId = canvasId
      const response = await listSceneDocumentItems(activeCanvasId, sceneId)

      if (activeCanvasId !== canvasId) {
        return
      }

      itemsBySceneId = {
        ...itemsBySceneId,
        [sceneId]: sortDocumentItems(response.items)
      }
    })().finally(() => pendingRefreshes.delete(refreshKey))

    pendingRefreshes.set(refreshKey, refresh)
    return refresh
  }

  async function loadFullDocument(
    sceneId: string,
    documentId: string,
    options: { force?: boolean } = {}
  ) {
    const cached = fullDocumentsById[documentId]
    if (cached && !options.force) {
      return cached
    }

    const activeCanvasId = canvasId
    const response = await getSceneDocument(activeCanvasId, sceneId, documentId)

    if (activeCanvasId === canvasId) {
      upsertFromFullDocument(response.item)
    }

    return response.item
  }

  function scheduleRevalidation() {
    if (!browser || !canvasId) {
      return
    }

    if (revalidateTimer) {
      clearTimeout(revalidateTimer)
    }

    revalidateTimer = setTimeout(() => {
      revalidateTimer = null
      void invalidate(sceneDocumentsDependency(canvasId))
    }, REVALIDATE_DEBOUNCE_MS)
  }

  function handleDocumentEvent(sceneId: string) {
    void refreshScene(sceneId).catch(() => undefined)
    scheduleRevalidation()
  }

  return {
    setCanvas,
    getItems,
    getFullDocument,
    refreshScene,
    loadFullDocument,
    upsertFromFullDocument,
    removeDocument,
    scheduleRevalidation,
    handleDocumentEvent,
    get canvasId() {
      return canvasId
    }
  }
}

export type SceneDocumentsStore = ReturnType<typeof createSceneDocumentsStore>

export function provideSceneDocumentsStore(input: SceneDocumentsStoreInput) {
  const store = createSceneDocumentsStore(input)
  setContext(SCENE_DOCUMENTS_CONTEXT, store)
  return store
}

export function useSceneDocumentsStore(fallback?: SceneDocumentsStoreInput) {
  const store = getContext<SceneDocumentsStore | undefined>(
    SCENE_DOCUMENTS_CONTEXT
  )

  if (!store && fallback) {
    return createSceneDocumentsStore(fallback)
  }

  if (!store) {
    throw new Error('Scene documents store was not provided.')
  }

  return store
}
