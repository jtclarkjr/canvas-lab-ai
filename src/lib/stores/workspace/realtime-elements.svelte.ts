import { supabase } from '$lib/auth/session-store'
import {
  deletedRowSchema,
  realtimeRowToConnector,
  realtimeRowSchema,
  realtimeRowToPath,
  realtimeRowToShape,
  realtimeRowToText
} from '$lib/workspace/element-mapping'
import type {
  DiagramConnector,
  DiagramShape,
  Path,
  TextElement
} from '$lib/canvas/types'

type ElementSetter<T> = (next: T[] | ((previous: T[]) => T[])) => void

type WorkspaceRealtimeElementsInput = {
  getActiveCanvasId: () => string
  getEditingTextId: () => string | undefined
  hasElementOwner: (id: string) => boolean
  setElementOwner: (id: string, ownerId: string | null) => void
  setPaths: ElementSetter<Path>
  setTextElements: ElementSetter<TextElement>
  setShapes: ElementSetter<DiagramShape>
  setConnectors: ElementSetter<DiagramConnector>
}

export function createWorkspaceRealtimeElementsStore({
  getActiveCanvasId,
  getEditingTextId,
  hasElementOwner,
  setElementOwner,
  setPaths,
  setTextElements,
  setShapes,
  setConnectors
}: WorkspaceRealtimeElementsInput) {
  $effect(() => {
    const client = supabase
    const activeCanvasId = getActiveCanvasId()
    if (!client || !activeCanvasId) {
      return
    }

    const channel = client
      .channel(`canvas:${activeCanvasId}:drawings`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'canvas_elements',
          filter: `canvas_id=eq.${activeCanvasId}`
        },
        (payload) => {
          const nextElement = realtimeRowSchema.parse(payload.new)
          if (!nextElement) return

          if (!hasElementOwner(nextElement.id)) {
            setElementOwner(nextElement.id, nextElement.created_by ?? null)
          }

          const nextPath = realtimeRowToPath(nextElement)
          if (nextPath) {
            setPaths((previous) => {
              if (previous.some((entry) => entry.id === nextElement.id)) {
                return previous
              }
              return [...previous, nextPath]
            })
            return
          }

          const nextText = realtimeRowToText(nextElement)
          if (nextText) {
            setTextElements((previous) => {
              if (previous.some((entry) => entry.id === nextElement.id)) {
                return previous
              }
              return [...previous, nextText]
            })
            return
          }

          const nextShape = realtimeRowToShape(nextElement)
          if (nextShape) {
            setShapes((previous) => {
              if (previous.some((entry) => entry.id === nextElement.id)) {
                return previous
              }
              return [...previous, nextShape]
            })
            return
          }

          const nextConnector = realtimeRowToConnector(nextElement)
          if (nextConnector) {
            setConnectors((previous) => {
              if (previous.some((entry) => entry.id === nextElement.id)) {
                return previous
              }
              return [...previous, nextConnector]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_elements',
          filter: `canvas_id=eq.${activeCanvasId}`
        },
        (payload) => {
          const nextElement = realtimeRowSchema.parse(payload.new)
          if (!nextElement?.id) return

          if (getEditingTextId() === nextElement.id) {
            return
          }

          const nextText = realtimeRowToText(nextElement)
          if (nextText) {
            setTextElements((previous) =>
              previous.map((entry) =>
                entry.id === nextElement.id
                  ? {
                      ...entry,
                      ...nextText
                    }
                  : entry
              )
            )
            return
          }

          const nextPath = realtimeRowToPath(nextElement)
          if (nextPath) {
            setPaths((previous) =>
              previous.map((entry) =>
                entry.id === nextElement.id
                  ? {
                      ...entry,
                      ...nextPath
                    }
                  : entry
              )
            )
            return
          }

          const nextShape = realtimeRowToShape(nextElement)
          if (nextShape) {
            setShapes((previous) =>
              previous.map((entry) =>
                entry.id === nextElement.id
                  ? {
                      ...entry,
                      ...nextShape
                    }
                  : entry
              )
            )
            return
          }

          const nextConnector = realtimeRowToConnector(nextElement)
          if (nextConnector) {
            setConnectors((previous) =>
              previous.map((entry) =>
                entry.id === nextElement.id
                  ? {
                      ...entry,
                      ...nextConnector
                    }
                  : entry
              )
            )
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'canvas_elements',
          filter: `canvas_id=eq.${activeCanvasId}`
        },
        (payload) => {
          const deleted = deletedRowSchema.parse(payload.old)
          if (!deleted) return
          setPaths((previous) =>
            previous.filter((entry) => entry.id !== deleted.id)
          )
          setTextElements((previous) =>
            previous.filter((entry) => entry.id !== deleted.id)
          )
          setShapes((previous) =>
            previous.filter((entry) => entry.id !== deleted.id)
          )
          setConnectors((previous) =>
            previous.filter((entry) => entry.id !== deleted.id)
          )
        }
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  })
}
