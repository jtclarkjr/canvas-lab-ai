import {
  createCreatePathCommand,
  createDeleteElementCommand,
  createDeleteMultipleCommand,
  createMoveMultipleCommand,
  type Command
} from '$lib/canvas/commands'
import {
  findTextAtPoint,
  isElementInSelection,
  isPointNearPath,
  textElementToData
} from '$lib/canvas/drawing-utils'
import type { UpsertElementInput } from '$lib/canvas/schema'
import type { EditingText, Path, Point, TextElement, Tool } from '$lib/canvas/types'
import type { createWorkspaceFormattingStore } from '$lib/stores/canvas/workspace/formatting.svelte'

type ElementSetter<T> = (next: T[] | ((previous: T[]) => T[])) => void

type UpsertElementMutation = {
  mutate(variables: UpsertElementInput, options?: { onError?: (error: unknown) => void }): void
}

type DeleteElementMutation = {
  mutate(variables: { id: string }, options?: { onError?: (error: unknown) => void }): void
}

type WorkspaceSceneInteractionsInput = {
  getActiveCanvasId: () => string
  getUserId: () => string
  getSelectedTool: () => Tool
  setSelectedTool: (tool: Tool) => void
  canEdit: () => boolean
  canModifyElement: (id: string) => boolean
  screenToCanvasPoint: (clientX: number, clientY: number) => Point
  getCameraScale: () => number
  getPaths: () => Path[]
  setPaths: ElementSetter<Path>
  getTextElements: () => TextElement[]
  setTextElements: ElementSetter<TextElement>
  getCurrentPath: () => Point[]
  setCurrentPath: (next: Point[]) => void
  getIsCurrentlyDrawing: () => boolean
  setIsCurrentlyDrawing: (next: boolean) => void
  getSelectionStart: () => Point | null
  setSelectionStart: (next: Point | null) => void
  getSelectionEnd: () => Point | null
  setSelectionEnd: (next: Point | null) => void
  getIsSelecting: () => boolean
  setIsSelecting: (next: boolean) => void
  getSelectedElementIds: () => Set<string>
  setSelectedElementIds: (next: Set<string>) => void
  getEditingText: () => EditingText | null
  setEditingText: (next: EditingText | null) => void
  setElementOwner: (id: string, ownerId: string | null) => void
  formattingStore: ReturnType<typeof createWorkspaceFormattingStore>
  addHistoryCommand: (command: Command) => void
  upsertElement: UpsertElementMutation
  deleteElement: DeleteElementMutation
  commitText: (text: EditingText | null) => void
  startTextEditingAtPosition: (x: number, y: number, value: string, id?: string) => void
}

export function createWorkspaceSceneInteractionsStore({
  getActiveCanvasId,
  getUserId,
  getSelectedTool,
  setSelectedTool,
  canEdit,
  canModifyElement,
  screenToCanvasPoint,
  getCameraScale,
  getPaths,
  setPaths,
  getTextElements,
  setTextElements,
  getCurrentPath,
  setCurrentPath,
  getIsCurrentlyDrawing,
  setIsCurrentlyDrawing,
  getSelectionStart,
  setSelectionStart,
  getSelectionEnd,
  setSelectionEnd,
  getIsSelecting,
  setIsSelecting,
  getSelectedElementIds,
  setSelectedElementIds,
  getEditingText,
  setEditingText,
  setElementOwner,
  formattingStore,
  addHistoryCommand,
  upsertElement,
  deleteElement,
  commitText,
  startTextEditingAtPosition
}: WorkspaceSceneInteractionsInput) {
  let pendingDrag: { elementId: string; startPos: Point } | null = null
  let originalElementPositions = {
    paths: new Map<string, Path>(),
    texts: new Map<string, TextElement>()
  }
  let lastClickTime = 0
  let lastClickPos: Point | null = null
  let isDraggingSelection = false
  let dragStartPos: Point | null = null

  function checkDoubleClick(point: Point) {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTime
    const isSamePosition =
      lastClickPos !== null && Math.abs(point.x - lastClickPos.x) < 5 && Math.abs(point.y - lastClickPos.y) < 5

    return timeSinceLastClick < 300 && isSamePosition
  }

  function updateClickTracking(point: Point) {
    lastClickTime = Date.now()
    lastClickPos = point
  }

  function deleteSelectedElements() {
    const selectedElementIds = new Set([...getSelectedElementIds()].filter((id) => canModifyElement(id)))
    setSelectedElementIds(selectedElementIds)
    if (selectedElementIds.size === 0) return

    const elementsToDelete: Array<{
      element: Path | TextElement
      type: 'path' | 'text'
    }> = []

    selectedElementIds.forEach((id) => {
      const path = getPaths().find((entry) => entry.id === id)
      const text = getTextElements().find((entry) => entry.id === id)

      if (path) {
        elementsToDelete.push({ element: path, type: 'path' })
      } else if (text) {
        elementsToDelete.push({ element: text, type: 'text' })
      }
    })

    if (elementsToDelete.length > 0) {
      addHistoryCommand(createDeleteMultipleCommand(elementsToDelete, getUserId()))
    }

    selectedElementIds.forEach((id) => {
      setPaths((previous) => previous.filter((entry) => entry.id !== id))
      setTextElements((previous) => previous.filter((entry) => entry.id !== id))
      deleteElement.mutate({ id })
    })

    setSelectedElementIds(new Set())
  }

  function startMultiDrag(point: Point) {
    isDraggingSelection = true
    dragStartPos = point

    const originalPaths = new Map<string, Path>()
    const originalTexts = new Map<string, TextElement>()
    const selectedElementIds = getSelectedElementIds()

    for (const path of getPaths()) {
      if (selectedElementIds.has(path.id)) {
        originalPaths.set(path.id, { ...path, points: [...path.points] })
      }
    }

    for (const text of getTextElements()) {
      if (selectedElementIds.has(text.id)) {
        originalTexts.set(text.id, { ...text })
      }
    }

    originalElementPositions = {
      paths: originalPaths,
      texts: originalTexts
    }
  }

  function continueMultiDrag(event: PointerEvent) {
    if (pendingDrag && getSelectedTool() === 'select') {
      const point = screenToCanvasPoint(event.clientX, event.clientY)
      const dx = Math.abs(point.x - pendingDrag.startPos.x)
      const dy = Math.abs(point.y - pendingDrag.startPos.y)
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 5) {
        startMultiDrag(pendingDrag.startPos)
        pendingDrag = null
      }
    }

    if (!isDraggingSelection || !dragStartPos) {
      return false
    }

    event.preventDefault()
    event.stopPropagation()

    const selectedElementIds = getSelectedElementIds()
    const currentPoint = screenToCanvasPoint(event.clientX, event.clientY)
    const dx = currentPoint.x - dragStartPos.x
    const dy = currentPoint.y - dragStartPos.y

    setPaths((previous) =>
      previous.map((path) => {
        if (!selectedElementIds.has(path.id)) return path
        const originalPath = originalElementPositions.paths.get(path.id)
        if (!originalPath) return path
        return {
          ...originalPath,
          points: originalPath.points.map((point) => ({
            x: point.x + dx,
            y: point.y + dy
          }))
        }
      })
    )

    setTextElements((previous) =>
      previous.map((text) => {
        if (!selectedElementIds.has(text.id)) return text
        const originalText = originalElementPositions.texts.get(text.id)
        if (!originalText) return text
        return {
          ...originalText,
          x: originalText.x + dx,
          y: originalText.y + dy
        }
      })
    )

    return true
  }

  function finishMultiDrag() {
    if (!isDraggingSelection) {
      return false
    }

    const moveElements: Array<{
      id: string
      type: 'path' | 'text'
      before: { x?: number; y?: number; points?: Point[] }
      after: { x?: number; y?: number; points?: Point[] }
    }> = []

    getSelectedElementIds().forEach((id) => {
      const currentPathItem = getPaths().find((entry) => entry.id === id)
      const currentText = getTextElements().find((entry) => entry.id === id)
      const originalPath = originalElementPositions.paths.get(id)
      const originalText = originalElementPositions.texts.get(id)

      if (currentPathItem && originalPath) {
        moveElements.push({
          id,
          type: 'path',
          before: { points: originalPath.points },
          after: { points: currentPathItem.points }
        })
      } else if (currentText && originalText) {
        moveElements.push({
          id,
          type: 'text',
          before: { x: originalText.x, y: originalText.y },
          after: { x: currentText.x, y: currentText.y }
        })
      }
    })

    if (moveElements.length > 0) {
      addHistoryCommand(createMoveMultipleCommand(moveElements, getUserId()))
    }

    getSelectedElementIds().forEach((id) => {
      const path = getPaths().find((entry) => entry.id === id)
      const text = getTextElements().find((entry) => entry.id === id)

      if (path) {
        upsertElement.mutate({
          id: path.id,
          canvasId: getActiveCanvasId(),
          type: 'path',
          data: {
            points: path.points,
            color: path.color,
            width: path.width
          },
          x: 0,
          y: 0,
          z: Date.now()
        })
      } else if (text) {
        upsertElement.mutate({
          id: text.id,
          canvasId: getActiveCanvasId(),
          type: 'text',
          data: textElementToData(text),
          x: text.x,
          y: text.y,
          z: Date.now()
        })
      }
    })

    isDraggingSelection = false
    dragStartPos = null
    originalElementPositions = {
      paths: new Map(),
      texts: new Map()
    }
    return true
  }

  function finishSelection() {
    const selectionStart = getSelectionStart()
    const selectionEnd = getSelectionEnd()
    if (!getIsSelecting() || !selectionStart || !selectionEnd) {
      return false
    }

    const rect = {
      x1: Math.min(selectionStart.x, selectionEnd.x),
      y1: Math.min(selectionStart.y, selectionEnd.y),
      x2: Math.max(selectionStart.x, selectionEnd.x),
      y2: Math.max(selectionStart.y, selectionEnd.y)
    }

    const nextSelected = new Set<string>()

    for (const path of getPaths()) {
      if (isElementInSelection(path, rect)) {
        nextSelected.add(path.id)
      }
    }

    for (const text of getTextElements()) {
      if (isElementInSelection(text, rect)) {
        nextSelected.add(text.id)
      }
    }

    setSelectedElementIds(new Set([...nextSelected].filter((id) => canModifyElement(id))))
    setIsSelecting(false)
    setSelectionStart(null)
    setSelectionEnd(null)
    return true
  }

  function finishDrawing() {
    if (getSelectedTool() !== 'pencil' || !getIsCurrentlyDrawing()) {
      return false
    }

    setIsCurrentlyDrawing(false)
    const currentPath = getCurrentPath()

    if (currentPath.length > 0) {
      const pathId = crypto.randomUUID()
      setElementOwner(pathId, getUserId())
      const pathData = {
        points: currentPath,
        color: formattingStore.drawFormatting.color,
        width: formattingStore.drawFormatting.width,
        opacity: formattingStore.drawFormatting.isHighlighter
          ? formattingStore.drawFormatting.highlighterOpacity
          : 1
      }

      const newPath: Path = {
        id: pathId,
        points: pathData.points,
        color: pathData.color,
        width: pathData.width,
        opacity: pathData.opacity
      }

      setPaths((previous) => [...previous, newPath])
      addHistoryCommand(createCreatePathCommand(newPath, getUserId()))
      setCurrentPath([])

      upsertElement.mutate(
        {
          id: pathId,
          canvasId: getActiveCanvasId(),
          type: 'path',
          data: pathData,
          x: 0,
          y: 0,
          z: Date.now()
        },
        {
          onError: () => {
            setPaths((previous) => previous.filter((entry) => entry.id !== pathId))
          }
        }
      )
    }

    return true
  }

  function handleSvgPointerDown(event: PointerEvent) {
    if (!event.isPrimary) return
    if (!canEdit()) return

    const selectedTool = getSelectedTool()
    if (selectedTool === 'pencil') {
      event.preventDefault()
      event.stopPropagation()
      ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
      setIsCurrentlyDrawing(true)
      setCurrentPath([screenToCanvasPoint(event.clientX, event.clientY)])
      return
    }

    if (selectedTool === 'eraser') {
      event.preventDefault()
      event.stopPropagation()
      ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
      const point = screenToCanvasPoint(event.clientX, event.clientY)
      const pathToDelete = getPaths().find((path) => isPointNearPath(point, path, 10))
      if (pathToDelete && canModifyElement(pathToDelete.id)) {
        addHistoryCommand(createDeleteElementCommand(pathToDelete, 'path', getUserId()))
        setPaths((previous) => previous.filter((entry) => entry.id !== pathToDelete.id))
        deleteElement.mutate(
          { id: pathToDelete.id },
          {
            onError: () => {
              setPaths((previous) => [...previous, pathToDelete])
            }
          }
        )
      }
      return
    }

    if (selectedTool === 'text') {
      event.preventDefault()
      event.stopPropagation()
      const point = screenToCanvasPoint(event.clientX, event.clientY)
      const hitText = findTextAtPoint(point, getTextElements())
      const wasEditing = !!getEditingText()
      const editingText = getEditingText()

      if (editingText) {
        commitText(editingText)
      }

      if (hitText && canModifyElement(hitText.id)) {
        formattingStore.syncTextFormattingFromElement(hitText)
        startTextEditingAtPosition(hitText.x, hitText.y, hitText.text, hitText.id)
      } else if (!hitText && !wasEditing) {
        startTextEditingAtPosition(point.x, point.y, '')
      }
      return
    }

    if (selectedTool !== 'select') {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    const point = screenToCanvasPoint(event.clientX, event.clientY)
    const hitText = findTextAtPoint(point, getTextElements())
    const isDoubleClick = checkDoubleClick(point)

    if (isDoubleClick && hitText && canModifyElement(hitText.id)) {
      setSelectedElementIds(new Set())
      const editingText = getEditingText()

      if (editingText?.value.trim()) {
        commitText(editingText)
      } else if (editingText) {
        setEditingText(null)
      }

      setSelectedTool('text')
      formattingStore.syncTextFormattingFromElement(hitText)
      startTextEditingAtPosition(hitText.x, hitText.y, hitText.text, hitText.id)
      return
    }

    updateClickTracking(point)

    const hitPath = getPaths().find((path) => isPointNearPath(point, path, 10 / getCameraScale()))
    const hitId = hitText?.id || hitPath?.id
    const hitElementId = hitId && canModifyElement(hitId) ? hitId : undefined
    const selectedElementIds = getSelectedElementIds()

    if (hitElementId) {
      ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
      pendingDrag = { elementId: hitElementId, startPos: point }
      if (!selectedElementIds.has(hitElementId)) {
        setSelectedElementIds(new Set([hitElementId]))
      }
    } else {
      ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
      setIsSelecting(true)
      setSelectionStart(point)
      setSelectionEnd(point)
      setSelectedElementIds(new Set())
    }
  }

  function handleSvgPointerMove(event: PointerEvent) {
    if (getIsSelecting() && getSelectionStart()) {
      event.preventDefault()
      event.stopPropagation()
      setSelectionEnd(screenToCanvasPoint(event.clientX, event.clientY))
      return
    }

    if (continueMultiDrag(event)) {
      return
    }

    if (getSelectedTool() === 'pencil' && getIsCurrentlyDrawing() && event.isPrimary) {
      event.preventDefault()
      event.stopPropagation()
      const point = screenToCanvasPoint(event.clientX, event.clientY)
      if (formattingStore.drawFormatting.style === 'straight') {
        const start = getCurrentPath()[0]
        setCurrentPath(start ? [start, point] : [point])
      } else {
        setCurrentPath([...getCurrentPath(), point])
      }
    }
  }

  function handleSvgPointerUp(event: PointerEvent) {
    pendingDrag = null

    if ((event.currentTarget as SVGSVGElement).hasPointerCapture(event.pointerId)) {
      ;(event.currentTarget as SVGSVGElement).releasePointerCapture(event.pointerId)
    }

    if (finishSelection()) return
    if (finishMultiDrag()) return
    finishDrawing()
  }

  function handleSvgDoubleClick(event: MouseEvent) {
    if (!canEdit()) return
    const point = screenToCanvasPoint(event.clientX, event.clientY)
    const hitText = findTextAtPoint(point, getTextElements())
    if (!hitText || !canModifyElement(hitText.id)) return

    event.preventDefault()
    event.stopPropagation()

    const editingText = getEditingText()
    if (editingText?.value.trim()) {
      commitText(editingText)
    } else if (editingText) {
      setEditingText(null)
    }

    setSelectedTool('text')
    formattingStore.syncTextFormattingFromElement(hitText)
    startTextEditingAtPosition(hitText.x, hitText.y, hitText.text, hitText.id)
  }

  return {
    deleteSelectedElements,
    handleSvgPointerDown,
    handleSvgPointerMove,
    handleSvgPointerUp,
    handleSvgDoubleClick
  }
}
