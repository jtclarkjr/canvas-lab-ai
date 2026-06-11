import { getInverseCommand, type Command } from '$lib/canvas/commands'

type WorkspaceHistoryInput = {
  getUserId: () => string
  applyCommand: (command: Command) => void
}

export function createWorkspaceHistoryStore({ getUserId, applyCommand }: WorkspaceHistoryInput) {
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
    applyCommand(getInverseCommand(command))
  }

  function handleRedo() {
    const command = redo()
    if (!command) return
    applyCommand(command)
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
