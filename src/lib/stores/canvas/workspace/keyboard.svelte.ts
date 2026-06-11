import type { EditingText, Tool } from '$lib/canvas/types'

type WorkspaceKeyboardInput = {
  getEditingText: () => EditingText | null
  getSelectedTool: () => Tool
  getCanUndo: () => boolean
  getCanRedo: () => boolean
  handleUndo: () => void
  handleRedo: () => void
  deleteSelectedElements: () => void
  clearSelection: () => void
}

export function createWorkspaceKeyboardStore({
  getEditingText,
  getSelectedTool,
  getCanUndo,
  getCanRedo,
  handleUndo,
  handleRedo,
  deleteSelectedElements,
  clearSelection
}: WorkspaceKeyboardInput) {
  function handleWorkspaceKeydown(event: KeyboardEvent) {
    if (
      event.target instanceof HTMLElement &&
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
    ) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          if (getCanRedo()) {
            handleRedo()
          }
        } else if (getCanUndo()) {
          handleUndo()
        }
      }
      return
    }

    if (getEditingText()) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
      }
      return
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) {
        if (getCanRedo()) {
          handleRedo()
        }
      } else if (getCanUndo()) {
        handleUndo()
      }
      return
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      if (getCanRedo()) {
        handleRedo()
      }
      return
    }

    if (getSelectedTool() !== 'select') {
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      deleteSelectedElements()
    }

    if (event.key === 'Escape') {
      clearSelection()
    }
  }

  return { handleWorkspaceKeydown }
}
