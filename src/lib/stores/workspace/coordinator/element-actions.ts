import { invalidateAll } from '$app/navigation'
import { ApiClientError } from '$lib/canvas/api'
import { createApplyCommand } from '$lib/canvas/apply-command'
import type { Command } from '$lib/canvas/commands'
import {
  deleteElement as deleteElementApi,
  listElements,
  upsertElement as upsertElementApi
} from '$lib/workspace/api'
import { canvasElementsToDrawingState } from '$lib/workspace/element-mapping'
import type { CanvasElement, UpsertElementInput } from '$lib/workspace/schema'
import type { WorkspaceCoordinatorState } from './state.svelte'

type WorkspaceElementActionsInput = {
  state: WorkspaceCoordinatorState
  setCanvasesError: (message: string | null) => void
}

export function createWorkspaceElementActions({
  state,
  setCanvasesError
}: WorkspaceElementActionsInput) {
  const upsertElement = {
    mutate(
      variables: UpsertElementInput,
      options?: { onError?: (error: unknown) => void }
    ) {
      void upsertElementApi(variables).catch((error) => {
        options?.onError?.(error)
      })
    }
  }

  const deleteElement = {
    mutate(
      variables: { id: string },
      options?: { onError?: (error: unknown) => void }
    ) {
      if (!state.activeCanvasId) {
        return
      }

      void deleteElementApi(state.activeCanvasId, variables.id).catch(
        (error) => {
          options?.onError?.(error)
        }
      )
    }
  }

  function applyCommand(command: Command) {
    createApplyCommand({
      canvasId: state.activeCanvasId,
      paths: state.paths,
      textElements: state.textElements,
      shapes: state.shapes,
      connectors: state.connectors,
      setPaths: (next) => state.setPaths(next),
      setTextElements: (next) => state.setTextElements(next),
      setShapes: (next) => state.setShapes(next),
      setConnectors: (next) => state.setConnectors(next),
      upsertElement,
      deleteElement
    })(command)
  }

  function syncElements(items: CanvasElement[]) {
    const drawingState = canvasElementsToDrawingState(items)
    state.elementOwners = drawingState.owners
    state.paths = drawingState.paths
    state.textElements = drawingState.textElements
    state.shapes = drawingState.shapes
    state.connectors = drawingState.connectors
  }

  async function loadCanvasElements(id: string) {
    try {
      const response = await listElements(id)
      syncElements(response.items)
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.status === 403 &&
        error.code === 'canvas_access_denied'
      ) {
        void invalidateAll()
        return
      }
      setCanvasesError(
        error instanceof Error
          ? error.message
          : 'Failed to load canvas elements.'
      )
    }
  }

  return {
    upsertElement,
    deleteElement,
    applyCommand,
    syncElements,
    loadCanvasElements
  }
}

export type WorkspaceElementActions = ReturnType<
  typeof createWorkspaceElementActions
>
