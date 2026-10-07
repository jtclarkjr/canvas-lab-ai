import {
  canvasHistoryEntrySchema,
  canvasHistoryRowSchema,
  type CanvasHistoryCommandType,
  type CanvasHistoryEntry
} from '#lib/workspace/schema.js'

export function toCanvasHistoryEntry(row: unknown): CanvasHistoryEntry {
  const history = canvasHistoryRowSchema.parse(row)

  return canvasHistoryEntrySchema.parse({
    id: history.id,
    canvasId: history.canvas_id,
    action: history.action,
    elementId: history.element_id,
    elementType: history.element_type,
    commandType: history.command_type,
    actor: {
      id: history.actor_id,
      name: history.actor_name,
      email: history.actor_email,
      image: history.actor_image
    },
    metadata: history.metadata ?? {},
    createdAt: history.created_at
  })
}

function commandVerb(commandType: CanvasHistoryCommandType | null): string {
  switch (commandType) {
    case 'CREATE_PATH':
    case 'CREATE_TEXT':
    case 'CREATE_SHAPE':
    case 'CREATE_CONNECTOR':
    case 'CREATE_MULTIPLE':
      return 'create'
    case 'UPDATE_TEXT':
    case 'UPDATE_ELEMENT':
    case 'UPDATE_MULTIPLE':
      return 'modify'
    case 'MOVE_ELEMENT':
    case 'MOVE_MULTIPLE':
      return 'move'
    case 'DELETE_ELEMENT':
    case 'DELETE_MULTIPLE':
      return 'delete'
    default:
      return 'change'
  }
}

export function getCanvasHistoryActionLabel(entry: CanvasHistoryEntry) {
  switch (entry.action) {
    case 'created':
      return `Created ${entry.elementType}`
    case 'modified':
      return `Modified ${entry.elementType}`
    case 'deleted':
      return `Deleted ${entry.elementType}`
    case 'undo':
      return `Undid ${commandVerb(entry.commandType)}`
    case 'redo':
      return `Redid ${commandVerb(entry.commandType)}`
  }
}

export function getCanvasHistoryNextBefore(
  items: CanvasHistoryEntry[],
  limit: number
): string | null {
  return items.length >= limit
    ? (items[items.length - 1]?.createdAt ?? null)
    : null
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('canvas history helpers', () => {
    const row = {
      id: 'history-1',
      canvas_id: 'canvas-1',
      action: 'undo',
      element_id: 'element-1',
      element_type: 'text',
      command_type: 'DELETE_ELEMENT',
      actor_id: 'user-1',
      actor_name: 'Ada',
      actor_email: 'ada@example.com',
      actor_image: null,
      metadata: null,
      created_at: '2026-06-30T00:00:00.000Z'
    }

    it('maps database rows into API entries', () => {
      expect(toCanvasHistoryEntry(row)).toEqual({
        id: 'history-1',
        canvasId: 'canvas-1',
        action: 'undo',
        elementId: 'element-1',
        elementType: 'text',
        commandType: 'DELETE_ELEMENT',
        actor: {
          id: 'user-1',
          name: 'Ada',
          email: 'ada@example.com',
          image: null
        },
        metadata: {},
        createdAt: '2026-06-30T00:00:00.000Z'
      })
    })

    it('labels normal and undo actions', () => {
      expect(
        getCanvasHistoryActionLabel(
          toCanvasHistoryEntry({
            ...row,
            action: 'created',
            command_type: null
          })
        )
      ).toBe('Created text')
      expect(getCanvasHistoryActionLabel(toCanvasHistoryEntry(row))).toBe(
        'Undid delete'
      )
    })

    it('returns a pagination cursor only when the page is full', () => {
      const first = toCanvasHistoryEntry(row)
      const second = toCanvasHistoryEntry({
        ...row,
        id: 'history-2',
        created_at: '2026-06-29T00:00:00.000Z'
      })

      expect(getCanvasHistoryNextBefore([first], 2)).toBeNull()
      expect(getCanvasHistoryNextBefore([first, second], 2)).toBe(
        '2026-06-29T00:00:00.000Z'
      )
    })
  })
}
