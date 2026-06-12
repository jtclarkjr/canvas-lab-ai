import { supabase } from '$lib/auth/session-store'
import {
  sceneMessageRowToMessage,
  sceneRowToScene
} from '$lib/scenes/mapping'
import {
  sceneMessageRowSchema,
  sceneRowSchema,
  type Scene,
  type SceneMessage
} from '$lib/scenes/schema'
import { z } from 'zod'

const deletedSceneRowSchema = z.object({ id: z.string() })
const documentEventRowSchema = z.object({
  id: z.string().optional(),
  scene_id: z.string()
})

type SceneSetter = (next: Scene[] | ((previous: Scene[]) => Scene[])) => void

type WorkspaceRealtimeScenesInput = {
  getActiveCanvasId: () => string
  isSceneBusy: (sceneId: string) => boolean
  setScenes: SceneSetter
  onSceneDeleted: (sceneId: string) => void
  onDocumentEvent: (sceneId: string, documentId?: string) => void
  onMessageInsert: (message: SceneMessage) => void
}

export function createWorkspaceRealtimeScenesStore({
  getActiveCanvasId,
  isSceneBusy,
  setScenes,
  onSceneDeleted,
  onDocumentEvent,
  onMessageInsert
}: WorkspaceRealtimeScenesInput) {
  $effect(() => {
    const client = supabase
    const activeCanvasId = getActiveCanvasId()
    if (!client || !activeCanvasId) {
      return
    }

    const channel = client
      .channel(`canvas:${activeCanvasId}:scenes`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'canvas_scenes',
          filter: `canvas_id=eq.${activeCanvasId}`
        },
        (payload) => {
          const parsed = sceneRowSchema.safeParse(payload.new)
          if (!parsed.success) return

          const nextScene = sceneRowToScene(parsed.data)
          setScenes((previous) => {
            if (previous.some((scene) => scene.id === nextScene.id)) {
              return previous
            }
            return [...previous, nextScene]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_scenes',
          filter: `canvas_id=eq.${activeCanvasId}`
        },
        (payload) => {
          const parsed = sceneRowSchema.safeParse(payload.new)
          if (!parsed.success) return

          // Don't clobber a card the local user is actively dragging or
          // resizing; their pointer-up persist wins.
          if (isSceneBusy(parsed.data.id)) {
            return
          }

          const nextScene = sceneRowToScene(parsed.data)
          setScenes((previous) => {
            if (!previous.some((scene) => scene.id === nextScene.id)) {
              return [...previous, nextScene]
            }
            return previous.map((scene) =>
              scene.id === nextScene.id ? nextScene : scene
            )
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'canvas_scenes',
          filter: `canvas_id=eq.${activeCanvasId}`
        },
        (payload) => {
          const parsed = deletedSceneRowSchema.safeParse(payload.old)
          if (!parsed.success) return

          setScenes((previous) =>
            previous.filter((scene) => scene.id !== parsed.data.id)
          )
          onSceneDeleted(parsed.data.id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canvas_scene_documents',
          filter: `canvas_id=eq.${activeCanvasId}`
        },
        (payload) => {
          // Document payloads can be large (TOAST-elided on UPDATE), so the
          // event is only a refetch signal for viewers of that scene.
          const parsed = documentEventRowSchema.safeParse(
            payload.eventType === 'DELETE' ? payload.old : payload.new
          )
          if (!parsed.success) return
          onDocumentEvent(parsed.data.scene_id, parsed.data.id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'canvas_scene_messages',
          filter: `canvas_id=eq.${activeCanvasId}`
        },
        (payload) => {
          const parsed = sceneMessageRowSchema.safeParse(payload.new)
          if (!parsed.success) return
          onMessageInsert(sceneMessageRowToMessage(parsed.data))
        }
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  })
}
