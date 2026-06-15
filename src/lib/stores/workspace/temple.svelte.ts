import { createCreateMultipleCommand, type Command } from '$lib/canvas/commands'
import { buildDiagramTemplate } from '$lib/canvas/temple'
import type {
  BuiltDiagramTemplate,
  DiagramTemplateId
} from '$lib/canvas/temple/types'
import type {
  DiagramConnector,
  DiagramFormatting,
  DiagramShape,
  EditingText,
  Point,
  Tool
} from '$lib/canvas/types'
import type { WorkspaceMode } from '$lib/scenes/types'

type WorkspaceTempleInput = {
  getActiveCanvasId: () => string
  getUserId: () => string
  getRootElement: () => HTMLDivElement | null
  getMode: () => WorkspaceMode
  canEdit: () => boolean
  screenToCanvasPoint: (clientX: number, clientY: number) => Point
  getEditingText: () => EditingText | null
  commitText: (text: EditingText | null) => void
  getDiagramFormatting: () => DiagramFormatting
  applyCommand: (command: Command) => void
  addHistoryCommand: (command: Command) => void
  setElementOwner: (id: string, ownerId: string | null) => void
  setSelectedElementIds: (next: Set<string>) => void
  setSelectedTool: (tool: Tool) => void
  setHoverCursorStyle: (next: string | null) => void
  setSelectionStart: (next: Point | null) => void
  setSelectionEnd: (next: Point | null) => void
  setIsSelecting: (next: boolean) => void
  setCurrentPath: (next: Point[]) => void
  setDraftShape: (next: DiagramShape | null) => void
  setDraftConnector: (next: DiagramConnector | null) => void
}

export function createWorkspaceTempleStore(input: WorkspaceTempleInput) {
  function insertDiagramTemplate(
    templateId: DiagramTemplateId
  ): BuiltDiagramTemplate | null {
    if (
      !input.canEdit() ||
      input.getMode() !== 'editor' ||
      !input.getActiveCanvasId()
    ) {
      return null
    }

    const rect = input.getRootElement()?.getBoundingClientRect()
    if (!rect) {
      return null
    }

    const editingText = input.getEditingText()
    if (editingText) {
      input.commitText(editingText)
    }

    const center = input.screenToCanvasPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    )
    const template = buildDiagramTemplate(templateId, {
      center,
      formatting: input.getDiagramFormatting(),
      zStart: Date.now()
    })
    const command = createCreateMultipleCommand(
      template.elements,
      input.getUserId()
    )

    for (const { element } of command.elements) {
      input.setElementOwner(element.id, input.getUserId())
    }

    input.applyCommand(command)
    input.addHistoryCommand(command)
    input.setSelectedElementIds(
      new Set(command.elements.map((entry) => entry.element.id))
    )
    input.setSelectedTool('select')
    input.setHoverCursorStyle('move')
    input.setSelectionStart(null)
    input.setSelectionEnd(null)
    input.setIsSelecting(false)
    input.setCurrentPath([])
    input.setDraftShape(null)
    input.setDraftConnector(null)

    return template
  }

  return {
    insertDiagramTemplate
  }
}
