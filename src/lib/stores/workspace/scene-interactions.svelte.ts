import {
  cloneCanvasElement,
  createCreateConnectorCommand,
  createCreatePathCommand,
  createCreateShapeCommand,
  createDeleteElementCommand,
  createDeleteMultipleCommand,
  createUpdateMultipleCommand,
  type Command
} from '$lib/canvas/commands'
import {
  findTextAtPoint,
  isElementInSelection,
  isPointNearPath,
  textElementToData
} from '$lib/canvas/drawing-utils'
import {
  cloneConnector,
  cloneEndpoint,
  cloneShape,
  connectorToData,
  findConnectorAtPoint,
  findConnectorEndpointAtPoint,
  findNearestShapeAnchor,
  findShapeAtPoint,
  findShapeHandleAtPoint,
  hasConnectorBindingToShape,
  isDiagramElementInSelection,
  makeConnector,
  makeShapeFromBounds,
  getShapeResizeCursor,
  resizeShapeFromHandle,
  resolveEndpoint,
  rotateShapeTowardPoint,
  shapeToData,
  type ShapeResizeHandle
} from '$lib/canvas/diagram-utils'
import type { UpsertElementInput } from '$lib/workspace/schema'
import type {
  Arrowhead,
  CanvasDrawableElement,
  CanvasElementType,
  ConnectorKind,
  DiagramConnector,
  DiagramEndpoint,
  DiagramShape,
  EditingText,
  Path,
  Point,
  ShapeKind,
  StrokeStyle,
  TextElement,
  Tool
} from '$lib/canvas/types'
import type { createWorkspaceFormattingStore } from '$lib/stores/workspace/formatting.svelte'

type ElementSetter<T> = (next: T[] | ((previous: T[]) => T[])) => void

type UpsertElementMutation = {
  mutate(
    variables: UpsertElementInput,
    options?: { onError?: (error: unknown) => void }
  ): void
}

type DeleteElementMutation = {
  mutate(
    variables: { id: string },
    options?: { onError?: (error: unknown) => void }
  ): void
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
  getShapes?: () => DiagramShape[]
  setShapes?: ElementSetter<DiagramShape>
  getConnectors?: () => DiagramConnector[]
  setConnectors?: ElementSetter<DiagramConnector>
  setDraftShape?: (next: DiagramShape | null) => void
  setDraftConnector?: (next: DiagramConnector | null) => void
  setHoverCursorStyle?: (next: string | null) => void
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
  startShapeTextEditing?: (shape: DiagramShape) => void
  startTextEditingAtPosition: (
    x: number,
    y: number,
    value: string,
    id?: string
  ) => void
}

type HitElement = {
  id: string
  type: CanvasElementType
  element: CanvasDrawableElement
}

type ActiveInteraction =
  | {
      type: 'shape-create'
      id: string
      start: Point
      z: number
    }
  | {
      type: 'connector-create'
      id: string
      start: DiagramEndpoint
      z: number
    }
  | {
      type: 'shape-resize'
      shapeId: string
      handle: ShapeResizeHandle
      original: DiagramShape
    }
  | {
      type: 'shape-rotate'
      shapeId: string
      original: DiagramShape
    }
  | {
      type: 'connector-end'
      connectorId: string
      end: 'start' | 'end'
      original: DiagramConnector
    }

type ArrangementAction = 'front' | 'forward' | 'backward' | 'back'

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
  getShapes,
  setShapes,
  getConnectors,
  setConnectors,
  setDraftShape,
  setDraftConnector,
  setHoverCursorStyle,
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
  startShapeTextEditing,
  startTextEditingAtPosition
}: WorkspaceSceneInteractionsInput) {
  const getShapesSafe = () => getShapes?.() ?? []
  const getConnectorsSafe = () => getConnectors?.() ?? []
  const setShapesSafe: ElementSetter<DiagramShape> = (next) => {
    setShapes?.(next)
  }
  const setConnectorsSafe: ElementSetter<DiagramConnector> = (next) => {
    setConnectors?.(next)
  }

  let activeInteraction: ActiveInteraction | null = null
  let pendingDrag: { elementId: string; startPos: Point } | null = null
  let originalElementPositions = {
    paths: new Map<string, Path>(),
    texts: new Map<string, TextElement>(),
    shapes: new Map<string, DiagramShape>(),
    connectors: new Map<string, DiagramConnector>()
  }
  let lastClickTime = 0
  let lastClickPos: Point | null = null
  let isDraggingSelection = false
  let dragStartPos: Point | null = null

  function setCursorStyle(next: string | null) {
    setHoverCursorStyle?.(next)
  }

  function cursorForInteraction(
    interaction: ActiveInteraction | null
  ): string | null {
    if (!interaction) return null

    switch (interaction.type) {
      case 'shape-create':
      case 'connector-create':
        return 'crosshair'
      case 'shape-resize':
        return getShapeResizeCursor(
          interaction.handle,
          interaction.original.rotation
        )
      case 'shape-rotate':
      case 'connector-end':
        return 'grabbing'
    }

    return null
  }

  function cursorForPoint(point: Point): string | null {
    if (!canEdit()) return null
    if (isDraggingSelection || pendingDrag) return 'move'

    switch (getSelectedTool()) {
      case 'select':
        return selectCursorForPoint(point)
      default:
        return null
    }
  }

  function selectCursorForPoint(point: Point): string | null {
    const selectedIds = getSelectedElementIds()
    const threshold = 10 / getCameraScale()
    const shapeHandle = findShapeHandleAtPoint(
      point,
      getShapesSafe(),
      selectedIds,
      threshold
    )

    if (shapeHandle && canModifyElement(shapeHandle.shape.id)) {
      switch (shapeHandle.type) {
        case 'resize':
          return getShapeResizeCursor(
            shapeHandle.handle,
            shapeHandle.shape.rotation
          )
        case 'rotate':
          return 'grab'
      }
    }

    const endpointHit = findConnectorEndpointAtPoint(
      point,
      getConnectorsSafe(),
      getShapesSafe(),
      selectedIds,
      threshold
    )

    if (endpointHit && canModifyElement(endpointHit.connector.id)) {
      return 'grab'
    }

    const hit = findTopElementAtPoint(point)
    if (!hit || !canModifyElement(hit.id)) return null

    switch (hit.type) {
      case 'shape':
      case 'connector':
      case 'path':
      case 'text':
        return 'move'
    }

    return null
  }

  function updateHoverCursor(event: PointerEvent) {
    if (event.type === 'pointerleave') {
      setCursorStyle(null)
      return
    }

    const activeCursor = cursorForInteraction(activeInteraction)
    if (activeCursor) {
      setCursorStyle(activeCursor)
      return
    }

    setCursorStyle(
      cursorForPoint(screenToCanvasPoint(event.clientX, event.clientY))
    )
  }

  function checkDoubleClick(point: Point) {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTime
    const isSamePosition =
      lastClickPos !== null &&
      Math.abs(point.x - lastClickPos.x) < 5 &&
      Math.abs(point.y - lastClickPos.y) < 5

    return timeSinceLastClick < 300 && isSamePosition
  }

  function updateClickTracking(point: Point) {
    lastClickTime = Date.now()
    lastClickPos = point
  }

  function nowZ() {
    return Date.now()
  }

  function persistElement(
    type: CanvasElementType,
    element: CanvasDrawableElement
  ) {
    const position = elementPosition(type, element)
    upsertElement.mutate({
      id: element.id,
      canvasId: getActiveCanvasId(),
      type,
      data: elementData(type, element),
      x: position.x,
      y: position.y,
      z: element.z ?? nowZ()
    })
  }

  function elementPosition(
    type: CanvasElementType,
    element: CanvasDrawableElement
  ): { x: number; y: number } {
    if (
      (type === 'text' || type === 'shape') &&
      'x' in element &&
      'y' in element
    ) {
      return { x: element.x, y: element.y }
    }
    return { x: 0, y: 0 }
  }

  function isShapeElement(
    element: CanvasDrawableElement
  ): element is DiagramShape {
    return 'width' in element && !('points' in element)
  }

  function isTextElement(
    element: CanvasDrawableElement
  ): element is TextElement {
    return 'fontSize' in element && !('kind' in element)
  }

  function elementData(
    type: CanvasElementType,
    element: CanvasDrawableElement
  ): Record<string, unknown> | null {
    if (type === 'path' && 'points' in element) {
      return {
        points: element.points,
        color: element.color,
        width: element.width,
        opacity: element.opacity
      }
    }
    if (type === 'text' && isTextElement(element)) {
      return textElementToData(element)
    }
    if (type === 'shape' && isShapeElement(element)) {
      return shapeToData(element)
    }
    if (type === 'connector' && 'start' in element) {
      return connectorToData(element)
    }
    return null
  }

  function removeElementLocally(id: string) {
    setPaths((previous) => previous.filter((entry) => entry.id !== id))
    setTextElements((previous) => previous.filter((entry) => entry.id !== id))
    setShapesSafe((previous) => previous.filter((entry) => entry.id !== id))
    setConnectorsSafe((previous) => previous.filter((entry) => entry.id !== id))
  }

  function allElements(): HitElement[] {
    const items: HitElement[] = [
      ...getPaths().map((element) => ({
        id: element.id,
        type: 'path' as CanvasElementType,
        element
      })),
      ...getTextElements().map((element) => ({
        id: element.id,
        type: 'text' as CanvasElementType,
        element
      })),
      ...getShapesSafe().map((element) => ({
        id: element.id,
        type: 'shape' as CanvasElementType,
        element
      })),
      ...getConnectorsSafe().map((element) => ({
        id: element.id,
        type: 'connector' as CanvasElementType,
        element
      }))
    ]
    return items.sort((first, second) => {
      const firstZ = first.element.z ?? 0
      const secondZ = second.element.z ?? 0
      return firstZ - secondZ
    })
  }

  function findElementById(id: string): HitElement | null {
    return allElements().find((entry) => entry.id === id) ?? null
  }

  function findTopElementAtPoint(point: Point): HitElement | null {
    const threshold = 10 / getCameraScale()
    const ordered = [...allElements()].reverse()
    for (const item of ordered) {
      switch (item.type) {
        case 'text':
          if (isTextElement(item.element)) {
            const hitText = findTextAtPoint(point, [item.element])
            if (hitText) return item
          }
          break
        case 'shape':
          if (
            isShapeElement(item.element) &&
            findShapeAtPoint(point, [item.element])
          ) {
            return item
          }
          break
        case 'connector':
          if (
            'start' in item.element &&
            findConnectorAtPoint(
              point,
              [item.element],
              getShapesSafe(),
              threshold
            )
          ) {
            return item
          }
          break
        case 'path':
          if (
            'points' in item.element &&
            isPointNearPath(point, item.element, threshold)
          ) {
            return item
          }
          break
      }
    }
    return null
  }

  function snapEndpoint(point: Point): DiagramEndpoint {
    const anchor = findNearestShapeAnchor(
      point,
      getShapesSafe(),
      14 / getCameraScale()
    )
    if (anchor) {
      return cloneEndpoint(anchor.endpoint)
    }
    return { x: point.x, y: point.y, binding: null }
  }

  function deleteSelectedElements() {
    const mutableSelectedIds = new Set(
      [...getSelectedElementIds()].filter((id) => canModifyElement(id))
    )
    const selectedShapeIds = new Set(
      getShapesSafe()
        .filter((shape) => mutableSelectedIds.has(shape.id))
        .map((shape) => shape.id)
    )

    for (const connector of getConnectorsSafe()) {
      for (const shapeId of selectedShapeIds) {
        if (
          hasConnectorBindingToShape(connector, shapeId) &&
          canModifyElement(connector.id)
        ) {
          mutableSelectedIds.add(connector.id)
        }
      }
    }

    setSelectedElementIds(mutableSelectedIds)
    if (mutableSelectedIds.size === 0) return

    const elementsToDelete: Array<{
      element: CanvasDrawableElement
      type: CanvasElementType
    }> = []

    mutableSelectedIds.forEach((id) => {
      const found = findElementById(id)
      if (found) {
        elementsToDelete.push({
          element: cloneCanvasElement(found.element, found.type),
          type: found.type
        })
      }
    })

    if (elementsToDelete.length > 0) {
      addHistoryCommand(
        createDeleteMultipleCommand(elementsToDelete, getUserId())
      )
    }

    mutableSelectedIds.forEach((id) => {
      removeElementLocally(id)
      deleteElement.mutate({ id })
    })

    setSelectedElementIds(new Set())
  }

  function startMultiDrag(point: Point) {
    isDraggingSelection = true
    setCursorStyle('move')
    dragStartPos = point
    const selectedElementIds = getSelectedElementIds()

    originalElementPositions = {
      paths: new Map(
        getPaths()
          .filter((path) => selectedElementIds.has(path.id))
          .map((path) => [path.id, { ...path, points: [...path.points] }])
      ),
      texts: new Map(
        getTextElements()
          .filter((text) => selectedElementIds.has(text.id))
          .map((text) => [text.id, { ...text }])
      ),
      shapes: new Map(
        getShapesSafe()
          .filter((shape) => selectedElementIds.has(shape.id))
          .map((shape) => [shape.id, cloneShape(shape)])
      ),
      connectors: new Map(
        getConnectorsSafe()
          .filter((connector) => selectedElementIds.has(connector.id))
          .map((connector) => [connector.id, cloneConnector(connector)])
      )
    }
  }

  function movedEndpoint(
    endpoint: DiagramEndpoint,
    dx: number,
    dy: number,
    selectedShapeIds: Set<string>
  ): DiagramEndpoint {
    if (endpoint.binding && selectedShapeIds.has(endpoint.binding.shapeId)) {
      return cloneEndpoint(endpoint)
    }
    const point = resolveEndpoint(endpoint, [
      ...originalElementPositions.shapes.values()
    ])
    return { x: point.x + dx, y: point.y + dy, binding: null }
  }

  function continueMultiDrag(event: PointerEvent) {
    if (pendingDrag && getSelectedTool() === 'select') {
      const point = screenToCanvasPoint(event.clientX, event.clientY)
      const dx = Math.abs(point.x - pendingDrag.startPos.x)
      const dy = Math.abs(point.y - pendingDrag.startPos.y)
      const dragDistance = Math.hypot(dx, dy)

      if (dragDistance > 5) {
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
    const selectedShapeIds = new Set(
      [...originalElementPositions.shapes.keys()].filter((id) =>
        selectedElementIds.has(id)
      )
    )
    const currentPoint = screenToCanvasPoint(event.clientX, event.clientY)
    const dx = currentPoint.x - dragStartPos.x
    const dy = currentPoint.y - dragStartPos.y

    setPaths((previous) =>
      previous.map((path) => {
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
        const originalText = originalElementPositions.texts.get(text.id)
        if (!originalText) return text
        return {
          ...originalText,
          x: originalText.x + dx,
          y: originalText.y + dy
        }
      })
    )

    setShapesSafe((previous) =>
      previous.map((shape) => {
        const originalShape = originalElementPositions.shapes.get(shape.id)
        if (!originalShape) return shape
        return {
          ...originalShape,
          x: originalShape.x + dx,
          y: originalShape.y + dy
        }
      })
    )

    setConnectorsSafe((previous) =>
      previous.map((connector) => {
        const originalConnector = originalElementPositions.connectors.get(
          connector.id
        )
        if (!originalConnector) return connector
        return {
          ...originalConnector,
          start: movedEndpoint(
            originalConnector.start,
            dx,
            dy,
            selectedShapeIds
          ),
          end: movedEndpoint(originalConnector.end, dx, dy, selectedShapeIds)
        }
      })
    )

    return true
  }

  function finishMultiDrag() {
    if (!isDraggingSelection) {
      return false
    }

    const updates: Array<{
      id: string
      type: CanvasElementType
      before: CanvasDrawableElement
      after: CanvasDrawableElement
    }> = []

    for (const [id, before] of originalElementPositions.paths) {
      const after = getPaths().find((entry) => entry.id === id)
      if (after) updates.push({ id, type: 'path', before, after })
    }
    for (const [id, before] of originalElementPositions.texts) {
      const after = getTextElements().find((entry) => entry.id === id)
      if (after) updates.push({ id, type: 'text', before, after })
    }
    for (const [id, before] of originalElementPositions.shapes) {
      const after = getShapesSafe().find((entry) => entry.id === id)
      if (after) updates.push({ id, type: 'shape', before, after })
    }
    for (const [id, before] of originalElementPositions.connectors) {
      const after = getConnectorsSafe().find((entry) => entry.id === id)
      if (after) updates.push({ id, type: 'connector', before, after })
    }

    if (updates.length > 0) {
      addHistoryCommand(createUpdateMultipleCommand(updates, getUserId()))
      for (const update of updates) {
        persistElement(update.type, update.after)
      }
    }

    isDraggingSelection = false
    dragStartPos = null
    originalElementPositions = {
      paths: new Map(),
      texts: new Map(),
      shapes: new Map(),
      connectors: new Map()
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

    for (const shape of getShapesSafe()) {
      if (isDiagramElementInSelection(shape, getShapesSafe(), rect)) {
        nextSelected.add(shape.id)
      }
    }

    for (const connector of getConnectorsSafe()) {
      if (isDiagramElementInSelection(connector, getShapesSafe(), rect)) {
        nextSelected.add(connector.id)
      }
    }

    setSelectedElementIds(
      new Set([...nextSelected].filter((id) => canModifyElement(id)))
    )
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
        opacity: pathData.opacity,
        z: nowZ()
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
          z: newPath.z
        },
        {
          onError: () => {
            setPaths((previous) =>
              previous.filter((entry) => entry.id !== pathId)
            )
          }
        }
      )
    }

    return true
  }

  function finishActiveInteraction(event: PointerEvent) {
    if (!activeInteraction) {
      return false
    }

    const point = screenToCanvasPoint(event.clientX, event.clientY)
    const interaction = activeInteraction
    activeInteraction = null

    if (interaction.type === 'shape-create') {
      const shape = makeShapeFromBounds(
        interaction.id,
        interaction.start,
        point,
        formattingStore.diagramFormatting,
        interaction.z
      )
      setDraftShape?.(null)
      setElementOwner(shape.id, getUserId())
      setShapesSafe((previous) => [...previous, shape])
      setSelectedElementIds(new Set([shape.id]))
      setSelectedTool('select')
      setCursorStyle('move')
      addHistoryCommand(createCreateShapeCommand(shape, getUserId()))
      persistElement('shape', shape)
      return true
    }

    if (interaction.type === 'connector-create') {
      const end = snapEndpoint(point)
      const startPoint = resolveEndpoint(interaction.start, getShapesSafe())
      const endPoint = resolveEndpoint(end, getShapesSafe())
      setDraftConnector?.(null)
      if (
        Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y) < 4
      ) {
        return true
      }
      const connector = makeConnector(
        interaction.id,
        interaction.start,
        end,
        formattingStore.diagramFormatting,
        interaction.z
      )
      setElementOwner(connector.id, getUserId())
      setConnectorsSafe((previous) => [...previous, connector])
      setSelectedElementIds(new Set([connector.id]))
      setSelectedTool('select')
      setCursorStyle('grab')
      addHistoryCommand(createCreateConnectorCommand(connector, getUserId()))
      persistElement('connector', connector)
      return true
    }

    if (interaction.type === 'shape-resize') {
      const after = getShapesSafe().find(
        (shape) => shape.id === interaction.shapeId
      )
      if (after) {
        addHistoryCommand(
          createUpdateMultipleCommand(
            [
              {
                id: after.id,
                type: 'shape',
                before: interaction.original,
                after
              }
            ],
            getUserId()
          )
        )
        persistElement('shape', after)
      }
      setCursorStyle(cursorForPoint(point))
      return true
    }

    if (interaction.type === 'shape-rotate') {
      const after = getShapesSafe().find(
        (shape) => shape.id === interaction.shapeId
      )
      if (after) {
        addHistoryCommand(
          createUpdateMultipleCommand(
            [
              {
                id: after.id,
                type: 'shape',
                before: interaction.original,
                after
              }
            ],
            getUserId()
          )
        )
        persistElement('shape', after)
      }
      setCursorStyle(cursorForPoint(point))
      return true
    }

    const after = getConnectorsSafe().find(
      (connector) => connector.id === interaction.connectorId
    )
    if (after) {
      addHistoryCommand(
        createUpdateMultipleCommand(
          [
            {
              id: after.id,
              type: 'connector',
              before: interaction.original,
              after
            }
          ],
          getUserId()
        )
      )
      persistElement('connector', after)
    }
    setCursorStyle(cursorForPoint(point))
    return true
  }

  function updateActiveInteraction(event: PointerEvent) {
    if (!activeInteraction) {
      return false
    }

    event.preventDefault()
    event.stopPropagation()
    const point = screenToCanvasPoint(event.clientX, event.clientY)
    const interaction = activeInteraction

    if (interaction.type === 'shape-create') {
      setCursorStyle(cursorForInteraction(interaction))
      setDraftShape?.(
        makeShapeFromBounds(
          interaction.id,
          interaction.start,
          point,
          formattingStore.diagramFormatting,
          interaction.z
        )
      )
      return true
    }

    if (interaction.type === 'connector-create') {
      setCursorStyle(cursorForInteraction(interaction))
      const end = snapEndpoint(point)
      setDraftConnector?.(
        makeConnector(
          interaction.id,
          interaction.start,
          end,
          formattingStore.diagramFormatting,
          interaction.z
        )
      )
      return true
    }

    if (interaction.type === 'shape-resize') {
      setCursorStyle(cursorForInteraction(interaction))
      setShapesSafe((previous) =>
        previous.map((shape) =>
          shape.id === interaction.shapeId
            ? resizeShapeFromHandle(
                interaction.original,
                interaction.handle,
                point
              )
            : shape
        )
      )
      return true
    }

    if (interaction.type === 'shape-rotate') {
      setCursorStyle(cursorForInteraction(interaction))
      setShapesSafe((previous) =>
        previous.map((shape) =>
          shape.id === interaction.shapeId
            ? rotateShapeTowardPoint(interaction.original, point)
            : shape
        )
      )
      return true
    }

    const endpoint = snapEndpoint(point)
    setCursorStyle(cursorForInteraction(interaction))
    setConnectorsSafe((previous) =>
      previous.map((connector) => {
        if (connector.id !== interaction.connectorId) {
          return connector
        }
        if (interaction.end === 'start') {
          return { ...connector, start: endpoint }
        }
        return { ...connector, end: endpoint }
      })
    )
    return true
  }

  function beginShapeCreation(event: PointerEvent, point: Point) {
    const id = crypto.randomUUID()
    const z = nowZ()
    activeInteraction = {
      type: 'shape-create',
      id,
      start: point,
      z
    }
    setCursorStyle(cursorForInteraction(activeInteraction))
    setSelectedElementIds(new Set())
    setDraftShape?.(
      makeShapeFromBounds(
        id,
        point,
        point,
        formattingStore.diagramFormatting,
        z
      )
    )
    ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
  }

  function beginConnectorCreation(event: PointerEvent, point: Point) {
    const id = crypto.randomUUID()
    const z = nowZ()
    const start = snapEndpoint(point)
    activeInteraction = {
      type: 'connector-create',
      id,
      start,
      z
    }
    setCursorStyle(cursorForInteraction(activeInteraction))
    setSelectedElementIds(new Set())
    setDraftConnector?.(
      makeConnector(id, start, start, formattingStore.diagramFormatting, z)
    )
    ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
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
      const hit = findTopElementAtPoint(point)
      if (hit && hit.type !== 'text' && canModifyElement(hit.id)) {
        addHistoryCommand(
          createDeleteElementCommand(hit.element, hit.type, getUserId())
        )
        removeElementLocally(hit.id)
        deleteElement.mutate({ id: hit.id })
      }
      return
    }

    if (selectedTool === 'text') {
      event.preventDefault()
      event.stopPropagation()
      const point = screenToCanvasPoint(event.clientX, event.clientY)
      const hitText = findTextAtPoint(point, getTextElements())
      const hitShape = findShapeAtPoint(point, getShapesSafe())
      const wasEditing = !!getEditingText()
      const editingText = getEditingText()

      if (editingText) {
        commitText(editingText)
      }

      if (hitShape && canModifyElement(hitShape.id)) {
        setSelectedTool('select')
        setSelectedElementIds(new Set([hitShape.id]))
        setCursorStyle('move')
        return
      }

      if (hitText && canModifyElement(hitText.id)) {
        formattingStore.syncTextFormattingFromElement(hitText)
        startTextEditingAtPosition(
          hitText.x,
          hitText.y,
          hitText.text,
          hitText.id
        )
        return
      }

      if (!hitText && !wasEditing) {
        startTextEditingAtPosition(point.x, point.y, '')
      }
      return
    }

    if (selectedTool === 'shape') {
      event.preventDefault()
      event.stopPropagation()
      beginShapeCreation(
        event,
        screenToCanvasPoint(event.clientX, event.clientY)
      )
      return
    }

    if (selectedTool === 'connector') {
      event.preventDefault()
      event.stopPropagation()
      beginConnectorCreation(
        event,
        screenToCanvasPoint(event.clientX, event.clientY)
      )
      return
    }

    if (selectedTool !== 'select') {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    const point = screenToCanvasPoint(event.clientX, event.clientY)
    const selectedIds = getSelectedElementIds()
    const handleThreshold = 10 / getCameraScale()
    const shapeHandle = findShapeHandleAtPoint(
      point,
      getShapesSafe(),
      selectedIds,
      handleThreshold
    )
    if (shapeHandle && canModifyElement(shapeHandle.shape.id)) {
      ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
      activeInteraction =
        shapeHandle.type === 'resize'
          ? {
              type: 'shape-resize',
              shapeId: shapeHandle.shape.id,
              handle: shapeHandle.handle,
              original: cloneShape(shapeHandle.shape)
            }
          : {
              type: 'shape-rotate',
              shapeId: shapeHandle.shape.id,
              original: cloneShape(shapeHandle.shape)
            }
      setCursorStyle(cursorForInteraction(activeInteraction))
      return
    }

    const endpointHit = findConnectorEndpointAtPoint(
      point,
      getConnectorsSafe(),
      getShapesSafe(),
      selectedIds,
      handleThreshold
    )
    if (endpointHit && canModifyElement(endpointHit.connector.id)) {
      ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
      activeInteraction = {
        type: 'connector-end',
        connectorId: endpointHit.connector.id,
        end: endpointHit.end,
        original: cloneConnector(endpointHit.connector)
      }
      setCursorStyle(cursorForInteraction(activeInteraction))
      return
    }

    const hitText = findTextAtPoint(point, getTextElements())
    const hit = findTopElementAtPoint(point)
    const isDoubleClick = checkDoubleClick(point)

    if (isDoubleClick && hitText && canModifyElement(hitText.id)) {
      setSelectedElementIds(new Set())
      const editingText = getEditingText()

      if (editingText?.value.trim()) {
        commitText(editingText)
      }
      if (editingText && !editingText.value.trim()) {
        setEditingText(null)
      }

      setSelectedTool('text')
      formattingStore.syncTextFormattingFromElement(hitText)
      startTextEditingAtPosition(hitText.x, hitText.y, hitText.text, hitText.id)
      return
    }

    if (
      isDoubleClick &&
      hit?.type === 'shape' &&
      isShapeElement(hit.element) &&
      canModifyElement(hit.id)
    ) {
      const editingText = getEditingText()
      if (editingText?.value.trim()) {
        commitText(editingText)
      }
      if (editingText && !editingText.value.trim()) {
        setEditingText(null)
      }

      setSelectedElementIds(new Set())
      setSelectedTool('text')
      startShapeTextEditing?.(hit.element)
      setCursorStyle('text')
      return
    }

    updateClickTracking(point)
    const hitElementId = hit && canModifyElement(hit.id) ? hit.id : undefined

    if (hitElementId) {
      ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
      pendingDrag = { elementId: hitElementId, startPos: point }
      setCursorStyle('move')
      if (!selectedIds.has(hitElementId)) {
        setSelectedElementIds(new Set([hitElementId]))
      }
    } else {
      ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
      setIsSelecting(true)
      setSelectionStart(point)
      setSelectionEnd(point)
      setCursorStyle(null)
      setSelectedElementIds(new Set())
    }
  }

  function handleSvgPointerMove(event: PointerEvent) {
    if (updateActiveInteraction(event)) {
      return
    }

    if (getIsSelecting() && getSelectionStart()) {
      event.preventDefault()
      event.stopPropagation()
      setSelectionEnd(screenToCanvasPoint(event.clientX, event.clientY))
      return
    }

    if (continueMultiDrag(event)) {
      return
    }

    if (
      getSelectedTool() === 'pencil' &&
      getIsCurrentlyDrawing() &&
      event.isPrimary
    ) {
      event.preventDefault()
      event.stopPropagation()
      const point = screenToCanvasPoint(event.clientX, event.clientY)
      if (formattingStore.drawFormatting.style === 'straight') {
        const start = getCurrentPath()[0]
        setCurrentPath(start ? [start, point] : [point])
      } else {
        setCurrentPath([...getCurrentPath(), point])
      }
      return
    }

    updateHoverCursor(event)
  }

  function handleSvgPointerUp(event: PointerEvent) {
    if (
      (event.currentTarget as SVGSVGElement).hasPointerCapture(event.pointerId)
    ) {
      ;(event.currentTarget as SVGSVGElement).releasePointerCapture(
        event.pointerId
      )
    }

    if (finishActiveInteraction(event)) {
      pendingDrag = null
      return
    }

    pendingDrag = null

    if (finishSelection()) {
      updateHoverCursor(event)
      return
    }
    if (finishMultiDrag()) {
      updateHoverCursor(event)
      return
    }
    finishDrawing()
    updateHoverCursor(event)
  }

  function handleSvgDoubleClick(event: MouseEvent) {
    if (!canEdit()) return
    if (getEditingText()?.target === 'shape') return
    const point = screenToCanvasPoint(event.clientX, event.clientY)
    const hitText = findTextAtPoint(point, getTextElements())
    const hit = findTopElementAtPoint(point)

    if (hitText && canModifyElement(hitText.id)) {
      event.preventDefault()
      event.stopPropagation()

      const editingText = getEditingText()
      if (editingText?.value.trim()) {
        commitText(editingText)
      }
      if (editingText && !editingText.value.trim()) {
        setEditingText(null)
      }

      setSelectedTool('text')
      formattingStore.syncTextFormattingFromElement(hitText)
      startTextEditingAtPosition(hitText.x, hitText.y, hitText.text, hitText.id)
      return
    }

    if (
      hit?.type !== 'shape' ||
      !isShapeElement(hit.element) ||
      !canModifyElement(hit.id)
    ) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const editingText = getEditingText()
    if (editingText?.value.trim()) {
      commitText(editingText)
    }
    if (editingText && !editingText.value.trim()) {
      setEditingText(null)
    }

    setSelectedTool('text')
    setSelectedElementIds(new Set())
    startShapeTextEditing?.(hit.element)
    setCursorStyle('text')
  }

  function updateSelectedDiagramElements(
    shapeUpdater: ((shape: DiagramShape) => DiagramShape) | null,
    connectorUpdater: ((connector: DiagramConnector) => DiagramConnector) | null
  ) {
    const selectedIds = getSelectedElementIds()
    const updates: Array<{
      id: string
      type: CanvasElementType
      before: CanvasDrawableElement
      after: CanvasDrawableElement
    }> = []

    if (shapeUpdater) {
      setShapesSafe((previous) =>
        previous.map((shape) => {
          if (!selectedIds.has(shape.id) || !canModifyElement(shape.id)) {
            return shape
          }
          const after = shapeUpdater(shape)
          updates.push({
            id: shape.id,
            type: 'shape',
            before: cloneShape(shape),
            after
          })
          return after
        })
      )
    }

    if (connectorUpdater) {
      setConnectorsSafe((previous) =>
        previous.map((connector) => {
          if (
            !selectedIds.has(connector.id) ||
            !canModifyElement(connector.id)
          ) {
            return connector
          }
          const after = connectorUpdater(connector)
          updates.push({
            id: connector.id,
            type: 'connector',
            before: cloneConnector(connector),
            after
          })
          return after
        })
      )
    }

    if (updates.length > 0) {
      addHistoryCommand(createUpdateMultipleCommand(updates, getUserId()))
      for (const update of updates) {
        persistElement(update.type, update.after)
      }
    }
  }

  function setShapeKind(kind: ShapeKind) {
    formattingStore.setShapeKind(kind)
    updateSelectedDiagramElements((shape) => ({ ...shape, kind }), null)
  }

  function setConnectorKind(kind: ConnectorKind) {
    formattingStore.setConnectorKind(kind)
    updateSelectedDiagramElements(null, (connector) => ({ ...connector, kind }))
  }

  function setDiagramFillColor(fillColor: string) {
    formattingStore.setDiagramFillColor(fillColor)
    updateSelectedDiagramElements((shape) => ({ ...shape, fillColor }), null)
  }

  function setDiagramStrokeColor(strokeColor: string) {
    formattingStore.setDiagramStrokeColor(strokeColor)
    updateSelectedDiagramElements(
      (shape) => ({ ...shape, strokeColor }),
      (connector) => ({ ...connector, strokeColor })
    )
  }

  function setDiagramStrokeWidth(strokeWidth: number) {
    formattingStore.setDiagramStrokeWidth(strokeWidth)
    updateSelectedDiagramElements(
      (shape) => ({ ...shape, strokeWidth }),
      (connector) => ({ ...connector, strokeWidth })
    )
  }

  function setDiagramStrokeStyle(strokeStyle: StrokeStyle) {
    formattingStore.setDiagramStrokeStyle(strokeStyle)
    updateSelectedDiagramElements(
      (shape) => ({ ...shape, strokeStyle }),
      (connector) => ({ ...connector, strokeStyle })
    )
  }

  function setDiagramOpacity(opacity: number) {
    formattingStore.setDiagramOpacity(opacity)
    updateSelectedDiagramElements(
      (shape) => ({ ...shape, opacity }),
      (connector) => ({ ...connector, opacity })
    )
  }

  function setDiagramStartArrow(startArrow: Arrowhead) {
    formattingStore.setDiagramStartArrow(startArrow)
    updateSelectedDiagramElements(null, (connector) => ({
      ...connector,
      startArrow
    }))
  }

  function setDiagramEndArrow(endArrow: Arrowhead) {
    formattingStore.setDiagramEndArrow(endArrow)
    updateSelectedDiagramElements(null, (connector) => ({
      ...connector,
      endArrow
    }))
  }

  function arrangeSelectedElements(action: ArrangementAction) {
    const selectedIds = getSelectedElementIds()
    if (selectedIds.size === 0) return
    const elements = allElements()
    const zValues = elements.map((entry) => entry.element.z ?? 0)
    const maxZ = Math.max(...zValues, 0)
    const minZ = Math.min(...zValues, 0)
    const updates: Array<{
      id: string
      type: CanvasElementType
      before: CanvasDrawableElement
      after: CanvasDrawableElement
    }> = []

    function nextZ(index: number, current: number | null | undefined) {
      if (action === 'front') return maxZ + index + 1
      if (action === 'back') return minZ - index - 1
      if (action === 'forward') return (current ?? 0) + 1000
      return (current ?? 0) - 1000
    }

    let selectedIndex = 0
    for (const entry of elements) {
      if (!selectedIds.has(entry.id) || !canModifyElement(entry.id)) {
        continue
      }
      selectedIndex += 1
      const after = {
        ...entry.element,
        z: nextZ(selectedIndex, entry.element.z)
      } as CanvasDrawableElement
      updates.push({
        id: entry.id,
        type: entry.type,
        before: cloneCanvasElement(entry.element, entry.type),
        after
      })
    }

    if (updates.length === 0) return

    setPaths((previous) =>
      previous.map((path) => {
        const update = updates.find((entry) => entry.id === path.id)
        return update && update.type === 'path' && 'points' in update.after
          ? update.after
          : path
      })
    )
    setTextElements((previous) =>
      previous.map((text) => {
        const update = updates.find((entry) => entry.id === text.id)
        return update && update.type === 'text' && isTextElement(update.after)
          ? update.after
          : text
      })
    )
    setShapesSafe((previous) =>
      previous.map((shape) => {
        const update = updates.find((entry) => entry.id === shape.id)
        return update && update.type === 'shape' && isShapeElement(update.after)
          ? update.after
          : shape
      })
    )
    setConnectorsSafe((previous) =>
      previous.map((connector) => {
        const update = updates.find((entry) => entry.id === connector.id)
        return update && update.type === 'connector' && 'start' in update.after
          ? update.after
          : connector
      })
    )

    addHistoryCommand(createUpdateMultipleCommand(updates, getUserId()))
    for (const update of updates) {
      persistElement(update.type, update.after)
    }
  }

  return {
    deleteSelectedElements,
    handleSvgPointerDown,
    handleSvgPointerMove,
    handleSvgPointerUp,
    handleSvgDoubleClick,
    setShapeKind,
    setConnectorKind,
    setDiagramFillColor,
    setDiagramStrokeColor,
    setDiagramStrokeWidth,
    setDiagramStrokeStyle,
    setDiagramOpacity,
    setDiagramStartArrow,
    setDiagramEndArrow,
    arrangeSelectedElements,
    get hasShapeSelection() {
      const selectedIds = getSelectedElementIds()
      return getShapesSafe().some((shape) => selectedIds.has(shape.id))
    },
    get hasConnectorSelection() {
      const selectedIds = getSelectedElementIds()
      return getConnectorsSafe().some((connector) =>
        selectedIds.has(connector.id)
      )
    }
  }
}
