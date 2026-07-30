import { getInverseCommand } from '$lib/canvas/commands'
import type { Command, CommandAudit } from '$lib/canvas/commands/types'

type WorkspaceHistoryInput = {
  getUserId: () => string
  applyCommand: (command: Command, audit?: CommandAudit) => void
}

export function createWorkspaceHistoryStore({
  getUserId,
  applyCommand
}: WorkspaceHistoryInput) {
  let undoStack = $state<Command[]>([])
  let redoStack = $state<Command[]>([])

  function addCommand(command: Command) {
    if (command.userId !== getUserId()) {
      return
    }

    undoStack = [...undoStack, command].slice(-50)
    redoStack = []
  }

  function undo() {
    const command = undoStack[undoStack.length - 1] ?? null
    if (!command) return null
    undoStack = undoStack.slice(0, -1)
    redoStack = [...redoStack, command].slice(-50)
    return command
  }

  function redo() {
    const command = redoStack[redoStack.length - 1] ?? null
    if (!command) return null
    redoStack = redoStack.slice(0, -1)
    undoStack = [...undoStack, command].slice(-50)
    return command
  }

  function clear() {
    undoStack = []
    redoStack = []
  }

  function handleUndo() {
    const command = undo()
    if (!command) return
    applyCommand(getInverseCommand(command), {
      action: 'undo',
      commandType: command.type
    })
  }

  function handleRedo() {
    const command = redo()
    if (!command) return
    applyCommand(command, {
      action: 'redo',
      commandType: command.type
    })
  }

  return {
    addCommand,
    handleUndo,
    handleRedo,
    clear,
    get canUndo() {
      return undoStack.length > 0
    },
    get canRedo() {
      return redoStack.length > 0
    }
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('workspace history store', () => {
    const createTextCommand = (): Command => ({
      type: 'CREATE_TEXT',
      timestamp: 1,
      userId: 'user-1',
      element: {
        id: 'text-1',
        text: 'Hello',
        x: 10,
        y: 20,
        rotation: 0,
        color: '#111111',
        fontSize: 16,
        isBold: false,
        isItalic: false,
        isUnderline: false
      }
    })

    it('records undo and redo audit metadata while preserving stack behavior', () => {
      const applied: Array<{ command: Command; audit?: CommandAudit }> = []
      const store = createWorkspaceHistoryStore({
        getUserId: () => 'user-1',
        applyCommand: (command, audit) => {
          applied.push({ command, audit })
        }
      })
      const command = createTextCommand()

      store.addCommand(command)
      expect(store.canUndo).toBe(true)
      expect(store.canRedo).toBe(false)

      store.handleUndo()
      expect(store.canUndo).toBe(false)
      expect(store.canRedo).toBe(true)
      expect(applied[0]?.command.type).toBe('DELETE_ELEMENT')
      expect(applied[0]?.audit).toEqual({
        action: 'undo',
        commandType: 'CREATE_TEXT'
      })

      store.handleRedo()
      expect(store.canUndo).toBe(true)
      expect(store.canRedo).toBe(false)
      expect(applied[1]?.command.type).toBe('CREATE_TEXT')
      expect(applied[1]?.audit).toEqual({
        action: 'redo',
        commandType: 'CREATE_TEXT'
      })
    })
  })
}
