import { supabase } from '$lib/auth/session-store'
import {
  deletedRowSchema,
  realtimeRowSchema,
  realtimeRowToPath,
  realtimeRowToText
} from '$lib/canvas/element-mapping'
import type { Path, TextElement } from '$lib/canvas/types'

type ElementSetter<T> = (next: T[] | ((previous: T[]) => T[])) => void

type WorkspaceRealtimeElementsInput = {
  getActiveCanvasId: () => string
  getEditingTextId: () => string | undefined
  hasElementOwner: (id: string) => boolean
  setElementOwner: (id: string, ownerId: string | null) => void
  setPaths: ElementSetter<Path>
  setTextElements: ElementSetter<TextElement>
}

export function createWorkspaceRealtimeElementsStore({
  getActiveCanvasId,
  getEditingTextId,
  hasElementOwner,
  setElementOwner,
  setPaths,
  setTextElements
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
          setPaths((previous) => previous.filter((entry) => entry.id !== deleted.id))
          setTextElements((previous) => previous.filter((entry) => entry.id !== deleted.id))
        }
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  })
}
