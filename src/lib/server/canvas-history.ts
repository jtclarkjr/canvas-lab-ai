import type { SupabaseClient } from '@supabase/supabase-js'
import {
  canvasHistoryElementTypeSchema,
  type CanvasHistoryAction,
  type CanvasHistoryCommandType,
  type CanvasHistoryElementType,
  type CanvasMutationAuditInput
} from '#lib/workspace/schema.js'
import type { Database } from '#lib/server/database.types.js'
import type { RequestUser } from '#lib/server/types.js'
import { toDbJson } from '#lib/server/json.js'

type ElementMutationAction = Extract<
  CanvasHistoryAction,
  'created' | 'modified' | 'deleted'
>

type RecordCanvasHistoryInput = {
  canvasId: string
  defaultAction: ElementMutationAction
  elementId: string
  elementType: string
  audit?: CanvasMutationAuditInput
  actor: RequestUser
  metadata?: Record<string, unknown>
}

export function resolveCanvasHistoryAction(
  defaultAction: ElementMutationAction,
  audit?: CanvasMutationAuditInput
): CanvasHistoryAction {
  return audit?.action ?? defaultAction
}

export function normalizeCanvasHistoryElementType(
  type: string
): CanvasHistoryElementType | null {
  const parsed = canvasHistoryElementTypeSchema.safeParse(type)
  return parsed.success ? parsed.data : null
}

export function actorSnapshot(actor: RequestUser) {
  return {
    actor_id: actor.id,
    actor_name: actor.name || actor.email || 'Unknown user',
    actor_email: actor.email || null,
    actor_image: actor.image
  }
}

export async function recordCanvasHistory(
  supabase: SupabaseClient<Database>,
  input: RecordCanvasHistoryInput
) {
  const elementType = normalizeCanvasHistoryElementType(input.elementType)
  if (!elementType) {
    return
  }

  const commandType: CanvasHistoryCommandType | null =
    input.audit?.commandType ?? null
  const { error } = await supabase.from('canvas_history').insert({
    canvas_id: input.canvasId,
    action: resolveCanvasHistoryAction(input.defaultAction, input.audit),
    element_id: input.elementId,
    element_type: elementType,
    command_type: commandType,
    ...actorSnapshot(input.actor),
    metadata: toDbJson(input.metadata ?? {})
  })

  if (error) {
    throw error
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('canvas history server helpers', () => {
    const actor: RequestUser = {
      id: 'user-1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      image: null,
      isAnonymous: false
    }

    it('uses inferred actions unless undo/redo audit metadata is present', () => {
      expect(resolveCanvasHistoryAction('created')).toBe('created')
      expect(
        resolveCanvasHistoryAction('modified', {
          action: 'undo',
          commandType: 'DELETE_ELEMENT'
        })
      ).toBe('undo')
      expect(
        resolveCanvasHistoryAction('deleted', {
          action: 'redo',
          commandType: 'CREATE_TEXT'
        })
      ).toBe('redo')
    })

    it('snapshots actor display fields', () => {
      expect(actorSnapshot(actor)).toEqual({
        actor_id: 'user-1',
        actor_name: 'Ada Lovelace',
        actor_email: 'ada@example.com',
        actor_image: null
      })
    })

    it('normalizes only drawable element history types', () => {
      expect(normalizeCanvasHistoryElementType('shape')).toBe('shape')
      expect(normalizeCanvasHistoryElementType('scene')).toBeNull()
    })
  })
}
