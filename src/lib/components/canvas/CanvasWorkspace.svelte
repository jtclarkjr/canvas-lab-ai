<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation'
  import { REALTIME_SUBSCRIBE_STATES, type RealtimeChannel } from '@supabase/supabase-js'
  import { Home } from 'lucide-svelte'
  import { onMount, tick } from 'svelte'
  import { z } from 'zod'
  import { ensureSessionInitialized, supabase } from '$lib/auth/session-store'
  import {
    ApiClientError,
    deleteElement as deleteElementApi,
    listAccessRequests,
    listCanvases,
    listElements,
    updateCanvas,
    upsertElement as upsertElementApi
  } from '$lib/canvas/api'
  import { createApplyCommand } from '$lib/canvas/apply-command'
  import {
    createCreatePathCommand,
    createCreateTextCommand,
    createDeleteElementCommand,
    createDeleteMultipleCommand,
    createMoveElementCommand,
    createMoveMultipleCommand,
    createUpdateTextCommand,
    getInverseCommand,
    type Command
  } from '$lib/canvas/commands'
  import type { AccessRequest, Canvas, CanvasElement, UpsertElementInput } from '$lib/canvas/schema'
  import type { CanvasRole } from '$lib/canvas/roles'
  import type {
    Camera,
    DrawFormatting,
    EditingText,
    ListStyle,
    Path,
    Point,
    TextElement,
    TextFormatting,
    Tool
  } from '$lib/canvas/types'
  import {
    calculateTextBounds,
    findTextAtPoint,
    getTextLineHeight,
    isElementInSelection,
    isPointNearPath,
    pathToSvgPath,
    screenToCanvas,
    TEXT_LINE_HEIGHT,
    textElementToData
  } from '$lib/canvas/drawing-utils'
  import {
    applyLegacyListStyle,
    continueListOnEnter,
    getSelectionListStyle,
    listStartValue,
    normalizeListText,
    toggleListStyle
  } from '$lib/canvas/text-lists'
  import CanvasActionToolbar from '$lib/components/canvas/CanvasActionToolbar.svelte'
  import CanvasOptionsButton from '$lib/components/canvas/CanvasOptionsButton.svelte'
  import CanvasToolbar from '$lib/components/canvas/CanvasToolbar.svelte'
  import DrawingToolbar from '$lib/components/canvas/DrawingToolbar.svelte'
  import LiveCursors from '$lib/components/canvas/LiveCursors.svelte'
  import ShareDialog from '$lib/components/canvas/ShareDialog.svelte'
  import TextFormattingToolbar from '$lib/components/canvas/TextFormattingToolbar.svelte'
  import { toast } from '$lib/stores/toast.svelte'

  let {
    canvasId,
    userId,
    userEmail,
    role = 'owner'
  } = $props<{
    canvasId: string
    userId: string
    userEmail?: string | null
    role?: CanvasRole
  }>()

  type CursorEventPayload = {
    position: { x: number; y: number }
    user: { id: string; name: string }
    color: string
    timestamp: number
  }

  const pointSchema = z.object({ x: z.number(), y: z.number() })
  const pathDataSchema = z
    .object({
      points: z.array(pointSchema).default([]),
      color: z.string().default('#000000'),
      width: z.number().default(2),
      opacity: z.number().min(0).max(1).default(1)
    })
    .nullable()
    .catch(null)
  const textDataSchema = z
    .object({
      text: z.string().default(''),
      color: z.string().default('#000000'),
      fontSize: z.number().default(16),
      isBold: z.boolean().default(false),
      isItalic: z.boolean().default(false),
      isUnderline: z.boolean().default(false),
      listStyle: z.enum(['none', 'bullet', 'number']).catch('none').default('none')
    })
    .nullable()
    .catch(null)
  const realtimeRowSchema = z
    .object({
      id: z.string(),
      type: z.string(),
      data: z.unknown(),
      x: z.number().nullable().optional(),
      y: z.number().nullable().optional(),
      created_by: z.string().nullable().optional()
    })
    .nullable()
    .catch(null)
  const deletedRowSchema = z.object({ id: z.string() }).nullable().catch(null)
  const cameraSchema = z.object({
    x: z.number(),
    y: z.number(),
    scale: z.number()
  })

  let rootEl = $state<HTMLDivElement | null>(null)
  let svgEl = $state<SVGSVGElement | null>(null)
  let titleInputEl = $state<HTMLInputElement | null>(null)
  let textInputEl = $state<HTMLTextAreaElement | null>(null)
  let dropdownEl = $state<HTMLDivElement | null>(null)

  let canvases = $state<Canvas[]>([])
  let canvasesError = $state<string | null>(null)
  let isLoadingCanvases = $state(false)
  let activeCanvasId = $state('')
  let showCanvasSelector = $state(false)
  let isEditingTitle = $state(false)
  let editedTitle = $state('')
  let selectedTool = $state<Tool>('select')
  let textFormatting = $state<TextFormatting>({
    fontSize: 16,
    isBold: false,
    isItalic: false,
    isUnderline: false,
    color: '#000000',
    listStyle: 'none'
  })
  let drawFormatting = $state<DrawFormatting>({
    width: 2,
    color: '#000000',
    style: 'freeform',
    isHighlighter: false,
    highlighterOpacity: 0.4
  })
  let camera = $state<Camera>({ x: 0, y: 0, scale: 1 })
  let isViewportDragging = $state(false)
  let lastPointerPos = { x: 0, y: 0 }
  let touchStart: {
    touches: Array<{ x: number; y: number }>
    distance: number
  } | null = null
  let initialCamera: Camera | null = null

  let paths = $state<Path[]>([])
  let textElements = $state<TextElement[]>([])
  let currentPath = $state<Point[]>([])
  let isCurrentlyDrawing = $state(false)
  let selectionStart = $state<Point | null>(null)
  let selectionEnd = $state<Point | null>(null)
  let isSelecting = $state(false)
  let selectedElementIds = $state<Set<string>>(new Set())
  let editingText = $state<EditingText | null>(null)
  let editorSelection = $state({ start: 0, end: 0 })
  const activeListStyle = $derived(
    editingText
      ? getSelectionListStyle(editingText.value, editorSelection.start, editorSelection.end)
      : textFormatting.listStyle
  )
  let isDraggingSelection = $state(false)
  let dragStartPos = $state<Point | null>(null)
  let undoStack = $state<Command[]>([])
  let redoStack = $state<Command[]>([])

  const cursorColor = $derived(colorFromId(userId))
  let cursors = $state<Record<string, CursorEventPayload>>({})
  let members = $state<Record<string, { name: string; color: string }>>({})

  const canEdit = $derived(role !== 'reader')
  const canManageCanvas = $derived(role === 'owner' || role === 'admin')
  let shareDialogOpen = $state(false)
  let pendingRequests = $state<AccessRequest[]>([])
  // Element ownership for the editor role; not reactive on purpose — it is
  // only consulted inside event handlers.
  let elementOwners = new Map<string, string | null>()

  function canModifyElement(id: string) {
    if (role === 'owner' || role === 'admin') {
      return true
    }
    return role === 'editor' && elementOwners.get(id) === userId
  }

  let pendingDrag: { elementId: string; startPos: Point } | null = null
  let originalElementPositions = {
    paths: new Map<string, Path>(),
    texts: new Map<string, TextElement>()
  }
  let lastClickTime = 0
  let lastClickPos: Point | null = null
  let originalTextValue: TextElement | null = null
  let lastLoadedCanvasId = ''

  function setPaths(next: Path[] | ((previous: Path[]) => Path[])) {
    paths = typeof next === 'function' ? next(paths) : next
  }

  function setTextElements(next: TextElement[] | ((previous: TextElement[]) => TextElement[])) {
    textElements = typeof next === 'function' ? next(textElements) : next
  }

  function setSelectedIds(next: Set<string> | ((previous: Set<string>) => Set<string>)) {
    selectedElementIds = typeof next === 'function' ? next(selectedElementIds) : next
  }

  function currentCanvas() {
    return canvases.find((canvas) => canvas.id === activeCanvasId) ?? null
  }

  function displayMembers() {
    const merged: Record<string, { name: string; color: string } | undefined> = {
      ...members,
      [userId]: { name: userEmail || 'You', color: cursorColor }
    }

    const unique = new Map<string, { id: string; name: string; color: string }>()

    for (const [id, member] of Object.entries(merged)) {
      if (member) {
        unique.set(id, { id, name: member.name, color: member.color })
      }
    }

    return Array.from(unique.values())
  }

  function roomName() {
    return activeCanvasId || canvasId || 'lobby'
  }

  function colorFromId(id: string) {
    let hash = 0
    for (let index = 0; index < id.length; index += 1) {
      hash = (hash << 5) - hash + id.charCodeAt(index)
      hash |= 0
    }

    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 95%, 70%)`
  }

  function getCursorStyle() {
    if (isViewportDragging) return 'grabbing'

    switch (selectedTool) {
      case 'pencil':
        return 'crosshair'
      case 'eraser':
        return 'pointer'
      case 'text':
        return 'text'
      case 'hand':
        return 'grab'
      default:
        return 'default'
    }
  }

  function screenToCanvasPoint(clientX: number, clientY: number): Point {
    if (!svgEl) {
      return { x: 0, y: 0 }
    }

    return screenToCanvas(clientX, clientY, svgEl.getBoundingClientRect(), camera)
  }

  function addCommand(command: Command) {
    if (command.userId !== userId) {
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

  function clearHistory() {
    undoStack = []
    redoStack = []
  }

  const upsertElement = {
    mutate(variables: UpsertElementInput, options?: { onError?: (error: unknown) => void }) {
      void upsertElementApi(variables).catch((error) => {
        options?.onError?.(error)
      })
    }
  }

  const deleteElement = {
    mutate(variables: { id: string }, options?: { onError?: (error: unknown) => void }) {
      if (!activeCanvasId) {
        return
      }

      void deleteElementApi(activeCanvasId, variables.id).catch((error) => {
        options?.onError?.(error)
      })
    }
  }

  function applyCommand(command: Command) {
    createApplyCommand({
      canvasId: activeCanvasId,
      paths,
      textElements,
      setPaths,
      setTextElements,
      upsertElement,
      deleteElement
    })(command)
  }

  async function loadCanvasesList() {
    isLoadingCanvases = true
    canvasesError = null

    try {
      const response = await listCanvases()
      canvases = response.items
    } catch (error) {
      canvasesError = error instanceof Error ? error.message : 'Failed to load canvases.'
    } finally {
      isLoadingCanvases = false
    }
  }

  function syncElements(items: CanvasElement[]) {
    elementOwners = new Map(items.map((element) => [element.id, element.createdBy ?? null]))

    const loadedPaths = items
      .filter((element) => element.type === 'path')
      .map((element) => {
        const pathData = pathDataSchema.parse(element.data)
        return {
          id: element.id,
          points: pathData?.points || [],
          color: pathData?.color || '#000000',
          width: pathData?.width || 2,
          opacity: pathData?.opacity ?? 1
        } satisfies Path
      })

    const loadedText = items
      .filter((element) => element.type === 'text')
      .map((element) => {
        const textData = textDataSchema.parse(element.data)
        return {
          id: element.id,
          text: applyLegacyListStyle(textData?.text || '', textData?.listStyle),
          x: element.x ?? 0,
          y: element.y ?? 0,
          color: textData?.color || '#000000',
          fontSize: textData?.fontSize || 16,
          isBold: textData?.isBold || false,
          isItalic: textData?.isItalic || false,
          isUnderline: textData?.isUnderline || false
        } satisfies TextElement
      })

    paths = loadedPaths
    textElements = loadedText
  }

  async function loadCanvasElements(id: string) {
    try {
      const response = await listElements(id)
      syncElements(response.items)
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.status === 403 &&
        error.code === 'canvas_access_denied'
      ) {
        // Access was revoked mid-session; re-run the page load so the
        // request-access screen takes over.
        void invalidateAll()
        return
      }
      canvasesError = error instanceof Error ? error.message : 'Failed to load canvas elements.'
    }
  }

  function loadCameraState(id: string) {
    const stored =
      typeof localStorage !== 'undefined' ? localStorage.getItem(`canvas-camera-${id}`) : null

    if (!stored) {
      camera = { x: 0, y: 0, scale: 1 }
      return
    }

    try {
      const parsed = cameraSchema.safeParse(JSON.parse(stored))
      camera = parsed.success ? parsed.data : { x: 0, y: 0, scale: 1 }
    } catch {
      camera = { x: 0, y: 0, scale: 1 }
    }
  }

  async function saveTitle() {
    const canvas = currentCanvas()
    if (!canvas || !editedTitle.trim()) {
      isEditingTitle = false
      return
    }

    try {
      const response = await updateCanvas(canvas.id, {
        title: editedTitle.trim()
      })
      canvases = canvases.map((entry) => (entry.id === canvas.id ? response.item : entry))
    } catch (error) {
      canvasesError = error instanceof Error ? error.message : 'Failed to update title.'
    } finally {
      isEditingTitle = false
    }
  }

  function beginTitleEdit() {
    const canvas = currentCanvas()
    if (!canvas || !canManageCanvas) {
      return
    }

    editedTitle = canvas.title
    isEditingTitle = true
    queueMicrotask(() => {
      titleInputEl?.focus()
      titleInputEl?.select()
    })
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

  function commitText(text: EditingText | null) {
    if (!text || !text.id) return
    const value = normalizeListText(text.value)

    if (!value) {
      const wasCreate = !originalTextValue
      const existingText = textElements.find((entry) => entry.id === text.id)
      if (existingText && !wasCreate) {
        addCommand(createDeleteElementCommand(existingText, 'text', userId))
      }
      setTextElements((previous) => previous.filter((entry) => entry.id !== text.id))

      if (!wasCreate) {
        deleteElement.mutate({ id: text.id })
      }

      editingText = null
      return
    }

    const existingText = textElements.find((entry) => entry.id === text.id)
    const textElement: TextElement = {
      id: text.id,
      text: value,
      x: existingText?.x ?? text.x,
      y: existingText?.y ?? text.y,
      color: textFormatting.color,
      fontSize: textFormatting.fontSize,
      isBold: textFormatting.isBold,
      isItalic: textFormatting.isItalic,
      isUnderline: textFormatting.isUnderline
    }

    if (existingText) {
      setTextElements((previous) =>
        previous.map((entry) => (entry.id === text.id ? textElement : entry))
      )
    } else {
      setTextElements((previous) => [...previous, textElement])
    }

    const wasCreate = !originalTextValue
    if (wasCreate) {
      addCommand(createCreateTextCommand(textElement, userId))
    } else if (originalTextValue) {
      addCommand(createUpdateTextCommand(text.id, originalTextValue, textElement, userId))
    }

    editingText = null

    upsertElement.mutate(
      {
        id: text.id,
        canvasId: activeCanvasId,
        type: 'text',
        data: textElementToData(textElement),
        x: textElement.x,
        y: textElement.y,
        z: Date.now()
      },
      {
        onError: () => {
          if (wasCreate) {
            setTextElements((previous) => previous.filter((entry) => entry.id !== text.id))
          } else if (originalTextValue) {
            setTextElements((previous) =>
              previous.map((entry) => (entry.id === text.id ? originalTextValue! : entry))
            )
          }
        }
      }
    )
  }

  function startTextEditingAtPosition(x: number, y: number, value: string, id?: string) {
    const textId = id ?? crypto.randomUUID()
    let initialValue = value

    if (id) {
      const existing = textElements.find((entry) => entry.id === id)
      originalTextValue = existing ? { ...existing } : null
    } else {
      originalTextValue = null
      elementOwners.set(textId, userId)
      if (!value) {
        initialValue = listStartValue(textFormatting.listStyle)
      }
      const placeholder: TextElement = {
        id: textId,
        text: initialValue,
        x,
        y,
        color: textFormatting.color,
        fontSize: textFormatting.fontSize,
        isBold: textFormatting.isBold,
        isItalic: textFormatting.isItalic,
        isUnderline: textFormatting.isUnderline
      }
      setTextElements((previous) => [...previous, placeholder])
    }

    editingText = { id: textId, x, y, value: initialValue }

    queueMicrotask(() => {
      textInputEl?.focus()
      if (id && initialValue) {
        textInputEl?.select()
      } else if (initialValue) {
        textInputEl?.setSelectionRange(initialValue.length, initialValue.length)
      }
      syncEditorSelection()
    })
  }

  function syncEditorSelection() {
    if (!textInputEl) return
    editorSelection = {
      start: textInputEl.selectionStart ?? 0,
      end: textInputEl.selectionEnd ?? 0
    }
  }

  function applyEditorValue(value: string) {
    editingText = editingText ? { ...editingText, value } : editingText
    setTextElements((previous) =>
      previous.map((entry) => (entry.id === editingText?.id ? { ...entry, text: value } : entry))
    )
  }

  async function handleListStyleToggle(style: Exclude<ListStyle, 'none'>) {
    if (editingText && textInputEl) {
      const result = toggleListStyle(
        editingText.value,
        textInputEl.selectionStart ?? editingText.value.length,
        textInputEl.selectionEnd ?? editingText.value.length,
        style
      )
      applyEditorValue(result.text)
      await tick()
      textInputEl?.setSelectionRange(result.selectionStart, result.selectionEnd)
      syncEditorSelection()
      return
    }
    textFormatting = {
      ...textFormatting,
      listStyle: textFormatting.listStyle === style ? 'none' : style
    }
  }

  async function handleTextEditorKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.isComposing && editingText) {
      if (!event.shiftKey) {
        event.preventDefault()
        commitText(editingText)
        return
      }
      const target = event.currentTarget as HTMLTextAreaElement
      const result = continueListOnEnter(
        editingText.value,
        target.selectionStart ?? editingText.value.length,
        target.selectionEnd ?? editingText.value.length
      )
      if (result) {
        event.preventDefault()
        applyEditorValue(result.text)
        await tick()
        textInputEl?.setSelectionRange(result.caret, result.caret)
        syncEditorSelection()
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      if (editingText?.id) {
        const existing = textElements.find((entry) => entry.id === editingText?.id)
        if (existing && !normalizeListText(existing.text)) {
          setTextElements((previous) => previous.filter((entry) => entry.id !== editingText?.id))
        }
      }
      editingText = null
    }
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

  function deleteSelectedElements() {
    selectedElementIds = new Set([...selectedElementIds].filter((id) => canModifyElement(id)))
    if (selectedElementIds.size === 0) return

    const elementsToDelete: Array<{
      element: Path | TextElement
      type: 'path' | 'text'
    }> = []

    selectedElementIds.forEach((id) => {
      const path = paths.find((entry) => entry.id === id)
      const text = textElements.find((entry) => entry.id === id)

      if (path) {
        elementsToDelete.push({ element: path, type: 'path' })
      } else if (text) {
        elementsToDelete.push({ element: text, type: 'text' })
      }
    })

    if (elementsToDelete.length > 0) {
      addCommand(createDeleteMultipleCommand(elementsToDelete, userId))
    }

    selectedElementIds.forEach((id) => {
      setPaths((previous) => previous.filter((entry) => entry.id !== id))
      setTextElements((previous) => previous.filter((entry) => entry.id !== id))
      deleteElement.mutate({ id })
    })

    selectedElementIds = new Set()
  }

  function startMultiDrag(point: Point) {
    isDraggingSelection = true
    dragStartPos = point

    const originalPaths = new Map<string, Path>()
    const originalTexts = new Map<string, TextElement>()

    for (const path of paths) {
      if (selectedElementIds.has(path.id)) {
        originalPaths.set(path.id, { ...path, points: [...path.points] })
      }
    }

    for (const text of textElements) {
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
    if (pendingDrag && selectedTool === 'select') {
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

    selectedElementIds.forEach((id) => {
      const currentPathItem = paths.find((entry) => entry.id === id)
      const currentText = textElements.find((entry) => entry.id === id)
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
      addCommand(createMoveMultipleCommand(moveElements, userId))
    }

    selectedElementIds.forEach((id) => {
      const path = paths.find((entry) => entry.id === id)
      const text = textElements.find((entry) => entry.id === id)

      if (path) {
        upsertElement.mutate({
          id: path.id,
          canvasId: activeCanvasId,
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
          canvasId: activeCanvasId,
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
    if (!isSelecting || !selectionStart || !selectionEnd) {
      return false
    }

    const rect = {
      x1: Math.min(selectionStart.x, selectionEnd.x),
      y1: Math.min(selectionStart.y, selectionEnd.y),
      x2: Math.max(selectionStart.x, selectionEnd.x),
      y2: Math.max(selectionStart.y, selectionEnd.y)
    }

    const nextSelected = new Set<string>()

    for (const path of paths) {
      if (isElementInSelection(path, rect)) {
        nextSelected.add(path.id)
      }
    }

    for (const text of textElements) {
      if (isElementInSelection(text, rect)) {
        nextSelected.add(text.id)
      }
    }

    selectedElementIds = new Set([...nextSelected].filter((id) => canModifyElement(id)))
    isSelecting = false
    selectionStart = null
    selectionEnd = null
    return true
  }

  function finishDrawing() {
    if (selectedTool !== 'pencil' || !isCurrentlyDrawing) {
      return false
    }

    isCurrentlyDrawing = false

    if (currentPath.length > 0) {
      const pathId = crypto.randomUUID()
      elementOwners.set(pathId, userId)
      const pathData = {
        points: currentPath,
        color: drawFormatting.color,
        width: drawFormatting.width,
        opacity: drawFormatting.isHighlighter ? drawFormatting.highlighterOpacity : 1
      }

      const newPath: Path = {
        id: pathId,
        points: pathData.points,
        color: pathData.color,
        width: pathData.width,
        opacity: pathData.opacity
      }

      setPaths((previous) => [...previous, newPath])
      addCommand(createCreatePathCommand(newPath, userId))
      currentPath = []

      upsertElement.mutate(
        {
          id: pathId,
          canvasId: activeCanvasId,
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
    if (!canEdit) return

    if (selectedTool === 'pencil') {
      event.preventDefault()
      event.stopPropagation()
      ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
      isCurrentlyDrawing = true
      currentPath = [screenToCanvasPoint(event.clientX, event.clientY)]
      return
    }

    if (selectedTool === 'eraser') {
      event.preventDefault()
      event.stopPropagation()
      ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
      const point = screenToCanvasPoint(event.clientX, event.clientY)
      const pathToDelete = paths.find((path) => isPointNearPath(point, path, 10))
      if (pathToDelete && canModifyElement(pathToDelete.id)) {
        addCommand(createDeleteElementCommand(pathToDelete, 'path', userId))
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
      const hitText = findTextAtPoint(point, textElements)
      const wasEditing = !!editingText

      if (editingText) {
        commitText(editingText)
      }

      if (hitText && canModifyElement(hitText.id)) {
        textFormatting = {
          fontSize: hitText.fontSize,
          isBold: hitText.isBold,
          isItalic: hitText.isItalic,
          isUnderline: hitText.isUnderline,
          color: hitText.color,
          listStyle: textFormatting.listStyle
        }
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
    const hitText = findTextAtPoint(point, textElements)
    const isDoubleClick = checkDoubleClick(point)

    if (isDoubleClick && hitText && canModifyElement(hitText.id)) {
      selectedElementIds = new Set()

      if (editingText?.value.trim()) {
        commitText(editingText)
      } else if (editingText) {
        editingText = null
      }

      selectedTool = 'text'
      textFormatting = {
        fontSize: hitText.fontSize,
        isBold: hitText.isBold,
        isItalic: hitText.isItalic,
        isUnderline: hitText.isUnderline,
        color: hitText.color,
        listStyle: textFormatting.listStyle
      }
      startTextEditingAtPosition(hitText.x, hitText.y, hitText.text, hitText.id)
      return
    }

    updateClickTracking(point)

    const hitPath = paths.find((path) => isPointNearPath(point, path, 10 / camera.scale))

    const hitId = hitText?.id || hitPath?.id
    // Elements the user cannot modify behave like empty canvas: editors can
    // only select, drag, and delete their own elements.
    const hitElementId = hitId && canModifyElement(hitId) ? hitId : undefined

    if (hitElementId) {
      ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
      pendingDrag = { elementId: hitElementId, startPos: point }
      if (!selectedElementIds.has(hitElementId)) {
        selectedElementIds = new Set([hitElementId])
      }
    } else {
      ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
      isSelecting = true
      selectionStart = point
      selectionEnd = point
      selectedElementIds = new Set()
    }
  }

  function handleSvgPointerMove(event: PointerEvent) {
    if (isSelecting && selectionStart) {
      event.preventDefault()
      event.stopPropagation()
      selectionEnd = screenToCanvasPoint(event.clientX, event.clientY)
      return
    }

    if (continueMultiDrag(event)) {
      return
    }

    if (selectedTool === 'pencil' && isCurrentlyDrawing && event.isPrimary) {
      event.preventDefault()
      event.stopPropagation()
      const point = screenToCanvasPoint(event.clientX, event.clientY)
      if (drawFormatting.style === 'straight') {
        const start = currentPath[0]
        currentPath = start ? [start, point] : [point]
      } else {
        currentPath = [...currentPath, point]
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
    if (!canEdit) return
    const point = screenToCanvasPoint(event.clientX, event.clientY)
    const hitText = findTextAtPoint(point, textElements)
    if (!hitText || !canModifyElement(hitText.id)) return

    event.preventDefault()
    event.stopPropagation()

    if (editingText?.value.trim()) {
      commitText(editingText)
    } else if (editingText) {
      editingText = null
    }

    selectedTool = 'text'
    textFormatting = {
      fontSize: hitText.fontSize,
      isBold: hitText.isBold,
      isItalic: hitText.isItalic,
      isUnderline: hitText.isUnderline,
      color: hitText.color,
      listStyle: textFormatting.listStyle
    }

    startTextEditingAtPosition(hitText.x, hitText.y, hitText.text, hitText.id)
  }

  function handleViewportPointerDown(event: PointerEvent) {
    if (selectedTool !== 'hand') return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if ((event.target as Element).closest('button, a, input, [role="button"]')) return

    if (event.pointerType !== 'mouse') {
      event.preventDefault()
    }

    ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
    isViewportDragging = true
    lastPointerPos = { x: event.clientX, y: event.clientY }
  }

  function handleViewportPointerMove(event: PointerEvent) {
    if (!isViewportDragging) return
    if (event.pointerType !== 'mouse') {
      event.preventDefault()
    }

    const dx = event.clientX - lastPointerPos.x
    const dy = event.clientY - lastPointerPos.y
    camera = {
      ...camera,
      x: camera.x + dx,
      y: camera.y + dy
    }
    lastPointerPos = { x: event.clientX, y: event.clientY }
  }

  function handleViewportPointerUp(event: PointerEvent) {
    isViewportDragging = false
    if ((event.currentTarget as HTMLDivElement).hasPointerCapture(event.pointerId)) {
      ;(event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId)
    }
  }

  function handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 1 && selectedTool === 'hand') {
      event.preventDefault()
      const touch = event.touches[0]
      if (!touch) return

      touchStart = {
        touches: [{ x: touch.clientX, y: touch.clientY }],
        distance: 0
      }
      initialCamera = { ...camera }
      return
    }

    if (event.touches.length >= 2) {
      event.preventDefault()

      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      if (!touch1 || !touch2) return

      const touches = [
        { x: touch1.clientX, y: touch1.clientY },
        { x: touch2.clientX, y: touch2.clientY }
      ]
      const distance = Math.hypot(touches[1].x - touches[0].x, touches[1].y - touches[0].y)

      touchStart = { touches, distance }
      initialCamera = { ...camera }
    } else {
      touchStart = null
      initialCamera = null
    }
  }

  function handleTouchMove(event: TouchEvent) {
    if (!touchStart || !initialCamera) {
      return
    }

    if (event.touches.length === 1 && touchStart.touches.length === 1) {
      event.preventDefault()
      const touch = event.touches[0]
      if (!touch) return

      const dx = touch.clientX - touchStart.touches[0].x
      const dy = touch.clientY - touchStart.touches[0].y

      camera = {
        x: initialCamera.x + dx,
        y: initialCamera.y + dy,
        scale: initialCamera.scale
      }
      return
    }

    if (event.touches.length >= 2 && touchStart.touches.length >= 2 && rootEl) {
      event.preventDefault()

      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      if (!touch1 || !touch2) return

      const currentTouches = [
        { x: touch1.clientX, y: touch1.clientY },
        { x: touch2.clientX, y: touch2.clientY }
      ]

      const currentDistance = Math.hypot(
        currentTouches[1].x - currentTouches[0].x,
        currentTouches[1].y - currentTouches[0].y
      )
      const scaleChange = currentDistance / touchStart.distance
      const newScale = Math.min(Math.max(0.1, initialCamera.scale * scaleChange), 5)

      const startMidpoint = {
        x: (touchStart.touches[0].x + touchStart.touches[1].x) / 2,
        y: (touchStart.touches[0].y + touchStart.touches[1].y) / 2
      }
      const currentMidpoint = {
        x: (currentTouches[0].x + currentTouches[1].x) / 2,
        y: (currentTouches[0].y + currentTouches[1].y) / 2
      }
      const panDelta = {
        x: currentMidpoint.x - startMidpoint.x,
        y: currentMidpoint.y - startMidpoint.y
      }

      const rect = rootEl.getBoundingClientRect()
      const pinchCenterX = currentMidpoint.x - rect.left
      const pinchCenterY = currentMidpoint.y - rect.top
      const scaleRatio = newScale / initialCamera.scale
      const newX = pinchCenterX - (pinchCenterX - initialCamera.x - panDelta.x) * scaleRatio
      const newY = pinchCenterY - (pinchCenterY - initialCamera.y - panDelta.y) * scaleRatio

      camera = {
        x: newX,
        y: newY,
        scale: newScale
      }
    }
  }

  function handleTouchEnd() {
    touchStart = null
    initialCamera = null
  }

  function handleResetView() {
    camera = { x: 0, y: 0, scale: 1 }
  }

  function handleTextInputBlur(event: FocusEvent) {
    if (!editingText) return

    const relatedTarget = event.relatedTarget instanceof Element ? event.relatedTarget : null
    if (relatedTarget?.closest('[data-text-formatting-toolbar]')) {
      return
    }

    const currentEditing = editingText
    queueMicrotask(() => {
      const nextFocused = document.activeElement instanceof Element ? document.activeElement : null

      if (nextFocused?.closest('[data-text-formatting-toolbar]')) {
        return
      }

      commitText(currentEditing)
    })
  }

  function handleWorkspaceKeydown(event: KeyboardEvent) {
    if (
      event.target instanceof HTMLElement &&
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
    ) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          if (redoStack.length > 0) {
            handleRedo()
          }
        } else if (undoStack.length > 0) {
          handleUndo()
        }
      }
      return
    }

    if (editingText) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
      }
      return
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) {
        if (redoStack.length > 0) {
          handleRedo()
        }
      } else if (undoStack.length > 0) {
        handleUndo()
      }
      return
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      if (redoStack.length > 0) {
        handleRedo()
      }
      return
    }

    if (selectedTool !== 'select') {
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      deleteSelectedElements()
    }

    if (event.key === 'Escape') {
      selectedElementIds = new Set()
      selectionStart = null
      selectionEnd = null
      isSelecting = false
    }
  }

  function createThrottledCursorSender(delay: number) {
    let lastCall = 0
    let timeout: ReturnType<typeof setTimeout> | null = null

    return (callback: (event: MouseEvent) => void, event: MouseEvent) => {
      const now = Date.now()
      const remaining = delay - (now - lastCall)

      if (remaining <= 0) {
        if (timeout) {
          clearTimeout(timeout)
          timeout = null
        }
        lastCall = now
        callback(event)
      } else if (!timeout) {
        timeout = setTimeout(() => {
          lastCall = Date.now()
          timeout = null
          callback(event)
        }, remaining)
      }
    }
  }

  onMount(() => {
    void loadCanvasesList()

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownEl && event.target instanceof Node && !dropdownEl.contains(event.target)) {
        showCanvasSelector = false
      }
    }

    window.addEventListener('keydown', handleWorkspaceKeydown)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('keydown', handleWorkspaceKeydown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  })

  $effect(() => {
    activeCanvasId = canvasId
  })

  $effect(() => {
    if (!canEdit && selectedTool !== 'hand') {
      selectedTool = 'hand'
    }
  })

  async function refreshPendingRequests(id: string) {
    try {
      const response = await listAccessRequests(id, 'pending')
      pendingRequests = response.items
    } catch {
      // Non-fatal: the badge just stays stale until the dialog is opened.
    }
  }

  $effect(() => {
    const client = supabase
    const id = activeCanvasId
    if (!client || !id || !canManageCanvas) {
      pendingRequests = []
      return
    }

    void refreshPendingRequests(id)

    let cancelled = false

    const channel = client
      .channel(`canvas:${id}:access-requests`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'canvas_access_requests',
          filter: `canvas_id=eq.${id}`
        },
        () => {
          void refreshPendingRequests(id).then(() => {
            toast.show({
              title: 'New access request',
              description: 'Someone wants to join this canvas.',
              action: {
                label: 'Review',
                onClick: () => (shareDialogOpen = true)
              }
            })
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_access_requests',
          filter: `canvas_id=eq.${id}`
        },
        (payload) => {
          const next = payload.new as { id?: string; status?: string }
          if (next.id && next.status !== 'pending') {
            pendingRequests = pendingRequests.filter((entry) => entry.id !== next.id)
          }
        }
      )

    // RLS limits delivery to owner/admins, so the realtime socket must carry
    // this user's JWT before subscribing.
    void ensureSessionInitialized().then((session) => {
      if (cancelled) return
      if (session?.access_token) {
        client.realtime.setAuth(session.access_token)
      }
      channel.subscribe()
    })

    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  })

  $effect(() => {
    const client = supabase
    const id = activeCanvasId
    if (!client || !id || role === 'owner') {
      return
    }

    let cancelled = false
    let membershipRowId: string | null = null

    function kickOut(message: string) {
      toast.show({ title: 'Access changed', description: message })
      void invalidateAll()
    }

    // React immediately when this user's membership is changed or revoked.
    // DELETE events ignore the canvas_id filter, and on RLS-enabled tables
    // their old record is stripped to the primary key — so removal is
    // matched against this user's membership row id, fetched up front.
    const channel = client
      .channel(`canvas:${id}:membership`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_members',
          filter: `canvas_id=eq.${id}`
        },
        (payload) => {
          const next = payload.new as { id?: string; user_id?: string }
          if (next.user_id === userId) {
            membershipRowId = next.id ?? membershipRowId
            kickOut('Your role on this canvas was changed.')
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'canvas_members'
        },
        (payload) => {
          const previous = payload.old as {
            id?: string
            user_id?: string
            canvas_id?: string
          }
          const matchesRowId = membershipRowId !== null && previous.id === membershipRowId
          const matchesColumns = previous.user_id === userId && previous.canvas_id === id
          if (matchesRowId || matchesColumns) {
            kickOut('Your access to this canvas was removed.')
          }
        }
      )

    void ensureSessionInitialized().then(async (session) => {
      if (cancelled) return
      if (session?.access_token) {
        client.realtime.setAuth(session.access_token)
      }

      const { data: membership } = await client
        .from('canvas_members')
        .select('id')
        .eq('canvas_id', id)
        .eq('user_id', userId)
        .maybeSingle()

      if (cancelled) return
      membershipRowId = (membership as { id: string } | null)?.id ?? null
      channel.subscribe()
    })

    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  })

  $effect(() => {
    const nextCanvasId = activeCanvasId
    if (!nextCanvasId || nextCanvasId === lastLoadedCanvasId) {
      return
    }

    lastLoadedCanvasId = nextCanvasId
    clearHistory()
    selectedElementIds = new Set()
    selectionStart = null
    selectionEnd = null
    currentPath = []
    editingText = null
    loadCameraState(nextCanvasId)
    void loadCanvasElements(nextCanvasId)
  })

  $effect(() => {
    if (typeof localStorage !== 'undefined' && activeCanvasId) {
      localStorage.setItem(`canvas-camera-${activeCanvasId}`, JSON.stringify(camera))
    }
  })

  $effect(() => {
    if (isEditingTitle) {
      queueMicrotask(() => {
        titleInputEl?.focus()
        titleInputEl?.select()
      })
    }
  })

  $effect(() => {
    const wasText = selectedTool === 'text'
    return () => {
      if (wasText || !editingText) {
        return
      }

      commitText(editingText)
    }
  })

  $effect(() => {
    const client = supabase
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

          if (!elementOwners.has(nextElement.id)) {
            elementOwners.set(nextElement.id, nextElement.created_by ?? null)
          }

          if (nextElement.type === 'path') {
            const pathData = pathDataSchema.parse(nextElement.data)
            if (!pathData) return
            setPaths((previous) => {
              if (previous.some((entry) => entry.id === nextElement.id)) {
                return previous
              }
              return [
                ...previous,
                {
                  id: nextElement.id,
                  points: pathData.points,
                  color: pathData.color,
                  width: pathData.width,
                  opacity: pathData.opacity
                }
              ]
            })
          } else if (nextElement.type === 'text') {
            const textData = textDataSchema.parse(nextElement.data)
            if (!textData) return
            setTextElements((previous) => {
              if (previous.some((entry) => entry.id === nextElement.id)) {
                return previous
              }
              return [
                ...previous,
                {
                  id: nextElement.id,
                  text: applyLegacyListStyle(textData.text, textData.listStyle),
                  color: textData.color,
                  fontSize: textData.fontSize,
                  isBold: textData.isBold,
                  isItalic: textData.isItalic,
                  isUnderline: textData.isUnderline,
                  x: nextElement.x ?? 0,
                  y: nextElement.y ?? 0
                }
              ]
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
          if (!nextElement || !nextElement.id) return

          if (editingText?.id === nextElement.id) {
            return
          }

          if (nextElement.type === 'text') {
            const textData = textDataSchema.parse(nextElement.data)
            if (!textData) return
            setTextElements((previous) =>
              previous.map((entry) =>
                entry.id === nextElement.id
                  ? {
                      ...entry,
                      text: applyLegacyListStyle(textData.text, textData.listStyle),
                      color: textData.color,
                      fontSize: textData.fontSize,
                      isBold: textData.isBold,
                      isItalic: textData.isItalic,
                      isUnderline: textData.isUnderline,
                      x: nextElement.x ?? 0,
                      y: nextElement.y ?? 0
                    }
                  : entry
              )
            )
          } else if (nextElement.type === 'path') {
            const pathData = pathDataSchema.parse(nextElement.data)
            if (!pathData) return
            setPaths((previous) =>
              previous.map((entry) =>
                entry.id === nextElement.id
                  ? {
                      ...entry,
                      points: pathData.points,
                      color: pathData.color,
                      width: pathData.width,
                      opacity: pathData.opacity
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

  $effect(() => {
    const client = supabase
    if (!client || !activeCanvasId) {
      cursors = {}
      members = {}
      return
    }

    let lastPayload: CursorEventPayload | null = null
    const throttle = createThrottledCursorSender(32)
    const channel = client.channel(roomName(), {
      config: { presence: { key: userId } }
    })
    let currentChannel: RealtimeChannel | null = null

    const sendCursor = (event: MouseEvent) => {
      const payload: CursorEventPayload = {
        position: { x: event.clientX, y: event.clientY },
        user: { id: userId, name: userEmail ?? 'anon' },
        color: cursorColor,
        timestamp: Date.now()
      }
      lastPayload = payload
      void currentChannel?.send({
        type: 'broadcast',
        event: 'realtime-cursor-move',
        payload
      })
    }

    const handleMouseMove = (event: MouseEvent) => {
      throttle(sendCursor, event)
    }

    channel
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence) => {
          cursors = Object.fromEntries(
            Object.entries(cursors).filter(([key]) => key !== String(presence.key))
          )
          members = Object.fromEntries(
            Object.entries(members).filter(([key]) => key !== String(presence.key))
          )
        })
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState() as Record<
          string,
          Array<{ name: string; color: string }>
        >
        const participants = Object.entries(state).reduce<
          Record<string, { name: string; color: string }>
        >((accumulator, [key, values]) => {
          const latest = values.length > 0 ? values[values.length - 1] : null
          if (latest) {
            accumulator[key] = { name: latest.name, color: latest.color }
          }
          return accumulator
        }, {})

        members = participants

        if (lastPayload) {
          void currentChannel?.send({
            type: 'broadcast',
            event: 'realtime-cursor-move',
            payload: lastPayload
          })
        }
      })
      .on(
        'broadcast',
        { event: 'realtime-cursor-move' },
        (data: { payload: CursorEventPayload }) => {
          const nextCursor = data.payload
          if (nextCursor.user.id === userId) {
            return
          }
          cursors = { ...cursors, [nextCursor.user.id]: nextCursor }
        }
      )
      .subscribe(async (status) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          await channel.track({
            key: userId,
            name: userEmail ?? 'anon',
            color: cursorColor
          })
          currentChannel = channel
          const state = channel.presenceState() as Record<
            string,
            Array<{ name: string; color: string }>
          >
          members = Object.entries(state).reduce<Record<string, { name: string; color: string }>>(
            (accumulator, [key, values]) => {
              const latest = values.length > 0 ? values[values.length - 1] : null
              if (latest) {
                accumulator[key] = { name: latest.name, color: latest.color }
              }
              return accumulator
            },
            {}
          )
        } else {
          cursors = {}
          members = {}
          currentChannel = null
        }
      })

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      currentChannel = null
      window.removeEventListener('mousemove', handleMouseMove)
      void client.removeChannel(channel)
    }
  })

  $effect(() => {
    if (!rootEl) return

    const wheelHandler = (event: WheelEvent) => {
      event.preventDefault()
      const rect = rootEl?.getBoundingClientRect()
      if (!rect) return

      if (event.ctrlKey || event.metaKey) {
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top
        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9
        const newScale = Math.min(Math.max(0.1, camera.scale * zoomFactor), 5)
        const scaleChange = newScale / camera.scale

        camera = {
          x: mouseX - (mouseX - camera.x) * scaleChange,
          y: mouseY - (mouseY - camera.y) * scaleChange,
          scale: newScale
        }
      } else {
        const dx = event.shiftKey ? -event.deltaY : -event.deltaX
        const dy = event.shiftKey ? 0 : -event.deltaY

        camera = {
          ...camera,
          x: camera.x + dx,
          y: camera.y + dy
        }
      }
    }

    rootEl.addEventListener('wheel', wheelHandler, { passive: false })
    return () => rootEl?.removeEventListener('wheel', wheelHandler)
  })
</script>

<div
  bind:this={rootEl}
  class="relative h-screen w-screen overflow-hidden"
  onpointerdown={handleViewportPointerDown}
  onpointermove={handleViewportPointerMove}
  onpointerup={handleViewportPointerUp}
  onpointercancel={handleViewportPointerUp}
  onpointerleave={handleViewportPointerUp}
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
  style={`cursor:${getCursorStyle()};overscroll-behavior:none;touch-action:none`}
  role="application"
>
  <div class="absolute inset-0 screen-grid bg-white"></div>

  <div class="fixed left-4 top-4 z-20 flex items-start gap-4">
    <div class="flex flex-col gap-2">
      <a
        href="/"
        class="toolbar-pill flex h-10 w-10 items-center justify-center transition hover:border-slate-700 hover:bg-slate-900"
        title="Back to dashboard"
      >
        <Home class="size-5" />
      </a>
      <CanvasToolbar
        {selectedTool}
        readOnly={!canEdit}
        onToolChange={(tool) => {
          if (selectedTool === 'text' && tool !== 'text' && editingText) {
            commitText(editingText)
          }
          selectedTool = tool
        }}
      />
    </div>

    <div class="flex items-start gap-2">
      {#if isEditingTitle}
        <div class="toolbar-pill flex items-center gap-1 px-3 py-1">
          <input
            bind:this={titleInputEl}
            class="w-[200px] border-0 bg-transparent text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200 outline-none"
            bind:value={editedTitle}
            onblur={() => void saveTitle()}
            onkeydown={(event) => {
              if (event.key === 'Enter') {
                void saveTitle()
              } else if (event.key === 'Escape') {
                isEditingTitle = false
              }
            }}
          />
        </div>
      {:else if canManageCanvas}
        <button
          type="button"
          class="toolbar-pill px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:border-slate-700 hover:bg-slate-900"
          onclick={beginTitleEdit}
        >
          {currentCanvas()?.title ?? 'Select Canvas'}
        </button>
      {:else}
        <span class="toolbar-pill px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
          {currentCanvas()?.title ?? 'Canvas'}
        </span>
      {/if}

      <div bind:this={dropdownEl} class="relative">
        <button
          type="button"
          class="toolbar-pill flex h-8 w-8 items-center justify-center transition hover:border-slate-700 hover:bg-slate-900"
          onclick={() => (showCanvasSelector = !showCanvasSelector)}
          title="Switch canvas"
        >
          ▾
        </button>
        {#if showCanvasSelector}
          <div
            class="absolute left-0 top-full mt-2 min-w-[200px] rounded-lg border border-slate-700 bg-slate-950 shadow-2xl shadow-black/70"
          >
            <div class="max-h-[300px] overflow-y-auto p-2">
              {#if canvases.length > 0}
                {#each canvases as canvas}
                  <button
                    type="button"
                    class={`w-full rounded px-3 py-2 text-left text-sm font-medium transition ${
                      canvas.id === activeCanvasId
                        ? 'bg-primary text-white'
                        : 'text-slate-100 hover:bg-slate-800'
                    }`}
                    onclick={() => {
                      showCanvasSelector = false
                      if (canvas.id !== activeCanvasId) {
                        void goto(`/canvas/${canvas.id}`)
                      }
                    }}
                  >
                    {canvas.title}
                  </button>
                {/each}
              {:else if isLoadingCanvases}
                <div class="px-3 py-2 text-sm text-slate-400">Loading canvases…</div>
              {:else}
                <div class="px-3 py-2 text-sm text-slate-400">No canvases yet</div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="pointer-events-auto fixed right-6 top-6 z-30 flex items-center gap-3">
    <div class="flex -space-x-2">
      {#each displayMembers().slice(0, 5) as member (member.id)}
        <span
          class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 text-[11px] font-bold shadow-inner shadow-black/30"
          style={`background-color:${member.color}`}
          title={member.name}
        >
          {member.name.trim().slice(0, 2).toUpperCase() || 'ME'}
        </span>
      {/each}
      {#if displayMembers().length > 5}
        <span
          class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-700 text-[11px] font-bold text-white shadow-inner shadow-black/30"
        >
          +{displayMembers().length - 5}
        </span>
      {/if}
    </div>

    <CanvasOptionsButton
      canvasId={activeCanvasId || canvasId}
      {role}
      pendingCount={pendingRequests.length}
      onShare={() => (shareDialogOpen = true)}
    />
  </div>

  <ShareDialog
    bind:open={shareDialogOpen}
    canvasId={activeCanvasId || canvasId}
    canvasTitle={currentCanvas()?.title ?? ''}
    {role}
    currentUserId={userId}
    {pendingRequests}
    onRequestResolved={(requestId) => {
      pendingRequests = pendingRequests.filter((entry) => entry.id !== requestId)
    }}
  />

  <TextFormattingToolbar
    fontSize={textFormatting.fontSize}
    isBold={textFormatting.isBold}
    isItalic={textFormatting.isItalic}
    isUnderline={textFormatting.isUnderline}
    color={textFormatting.color}
    listStyle={activeListStyle}
    isVisible={selectedTool === 'text'}
    onFontSizeChange={(fontSize) => {
      textFormatting = { ...textFormatting, fontSize }
    }}
    onBoldToggle={() => {
      textFormatting = { ...textFormatting, isBold: !textFormatting.isBold }
    }}
    onItalicToggle={() => {
      textFormatting = {
        ...textFormatting,
        isItalic: !textFormatting.isItalic
      }
    }}
    onUnderlineToggle={() => {
      textFormatting = {
        ...textFormatting,
        isUnderline: !textFormatting.isUnderline
      }
    }}
    onColorChange={(color) => {
      textFormatting = { ...textFormatting, color }
    }}
    onListStyleChange={handleListStyleToggle}
  />

  <DrawingToolbar
    width={drawFormatting.width}
    color={drawFormatting.color}
    style={drawFormatting.style}
    isHighlighter={drawFormatting.isHighlighter}
    highlighterOpacity={drawFormatting.highlighterOpacity}
    isVisible={selectedTool === 'pencil'}
    onWidthChange={(width) => {
      drawFormatting = { ...drawFormatting, width }
    }}
    onColorChange={(color) => {
      drawFormatting = { ...drawFormatting, color }
    }}
    onStyleChange={(style) => {
      drawFormatting = { ...drawFormatting, style }
    }}
    onHighlighterToggle={() => {
      drawFormatting = { ...drawFormatting, isHighlighter: !drawFormatting.isHighlighter }
    }}
    onHighlighterOpacityChange={(highlighterOpacity) => {
      drawFormatting = { ...drawFormatting, highlighterOpacity }
    }}
  />

  {#if canvasesError}
    <div
      class="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-red-600 px-4 py-2 text-sm text-white shadow-lg"
    >
      {canvasesError}
    </div>
  {/if}

  <svg
    bind:this={svgEl}
    aria-label="Drawing canvas"
    class="absolute inset-0 h-full w-full select-none"
    role="img"
    onpointerdown={handleSvgPointerDown}
    onpointermove={handleSvgPointerMove}
    onpointerup={handleSvgPointerUp}
    onpointercancel={handleSvgPointerUp}
    onpointerleave={handleSvgPointerUp}
    ondblclick={handleSvgDoubleClick}
    style={`pointer-events:${canEdit && ['select', 'pencil', 'eraser', 'text'].includes(selectedTool) ? 'auto' : 'none'};user-select:none;-webkit-user-select:none;touch-action:none`}
  >
    <g transform={`translate(${camera.x}, ${camera.y}) scale(${camera.scale})`}>
      {#each paths as path (path.id)}
        <path
          d={pathToSvgPath(path.points)}
          fill="none"
          filter={selectedElementIds.has(path.id)
            ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.8))'
            : undefined}
          stroke={path.color}
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-opacity={path.opacity}
          stroke-width={path.width}
        />
      {/each}

      {#if currentPath.length > 0}
        <path
          d={pathToSvgPath(currentPath)}
          fill="none"
          stroke={drawFormatting.color}
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-opacity={drawFormatting.isHighlighter ? drawFormatting.highlighterOpacity : 1}
          stroke-width={drawFormatting.width}
        />
      {/if}

      {#each textElements as text (text.id)}
        {#if editingText?.id !== text.id}
          {@const bounds = calculateTextBounds(text)}
          <g>
            {#if selectedElementIds.has(text.id)}
              <rect
                fill="rgba(59, 130, 246, 0.1)"
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                rx={2 / camera.scale}
                stroke="#3b82f6"
                stroke-width={1 / camera.scale}
              />
            {/if}
            <text
              class="select-none"
              dominant-baseline="hanging"
              fill={text.color}
              font-size={text.fontSize}
              font-style={text.isItalic ? 'italic' : 'normal'}
              font-weight={text.isBold ? 'bold' : 'normal'}
              style="pointer-events:none"
              text-decoration={text.isUnderline ? 'underline' : 'none'}
              x={text.x}
              y={text.y}
            >
              {#each text.text.split('\n') as line, lineIndex (lineIndex)}
                <tspan x={text.x} y={text.y + lineIndex * getTextLineHeight(text.fontSize)}>
                  {line}
                </tspan>
              {/each}
            </text>
          </g>
        {/if}
      {/each}

      {#if selectionStart && selectionEnd}
        <rect
          fill="rgba(59, 130, 246, 0.1)"
          x={Math.min(selectionStart.x, selectionEnd.x)}
          y={Math.min(selectionStart.y, selectionEnd.y)}
          width={Math.abs(selectionEnd.x - selectionStart.x)}
          height={Math.abs(selectionEnd.y - selectionStart.y)}
          pointer-events="none"
          stroke="#3b82f6"
          stroke-dasharray={`${4 / camera.scale} ${2 / camera.scale}`}
          stroke-width={1 / camera.scale}
        />
      {/if}
    </g>
  </svg>

  {#if editingText}
    {@const editorLines = editingText.value.split('\n')}
    {@const longestEditorLine = Math.max(...editorLines.map((line) => line.length), 1)}
    {@const editorWidth = Math.max(
      120,
      longestEditorLine * textFormatting.fontSize * 0.6 * camera.scale + 16
    )}
    <textarea
      bind:this={textInputEl}
      class="absolute border-none bg-transparent caret-current outline-none"
      style={`left:${camera.x + editingText.x * camera.scale}px;top:${camera.y + editingText.y * camera.scale}px;font-size:${textFormatting.fontSize * camera.scale}px;line-height:${TEXT_LINE_HEIGHT};color:${textFormatting.color};font-weight:${textFormatting.isBold ? 'bold' : 'normal'};font-style:${textFormatting.isItalic ? 'italic' : 'normal'};text-decoration:${textFormatting.isUnderline ? 'underline' : 'none'};width:${editorWidth}px;resize:none;overflow:hidden;white-space:pre;box-shadow:inset 0 0 0 1px rgba(59,130,246,.2);padding:0;margin:0`}
      rows={editorLines.length}
      wrap="off"
      value={editingText.value}
      oninput={(event) => {
        applyEditorValue((event.currentTarget as HTMLTextAreaElement).value)
        syncEditorSelection()
      }}
      onblur={handleTextInputBlur}
      onkeydown={handleTextEditorKeydown}
      onkeyup={syncEditorSelection}
      onpointerup={syncEditorSelection}
      onselect={syncEditorSelection}
    ></textarea>
  {/if}

  <LiveCursors {cursors} />

  {#if canEdit}
    <CanvasActionToolbar
      selectedCount={selectedElementIds.size}
      canUndo={undoStack.length > 0}
      canRedo={redoStack.length > 0}
      onDelete={deleteSelectedElements}
      onUndo={handleUndo}
      onRedo={handleRedo}
    />
  {/if}

  <div class="pointer-events-auto fixed bottom-6 right-6 z-30 flex flex-col gap-2">
    <button
      type="button"
      class="toolbar-pill flex h-10 w-10 items-center justify-center transition hover:border-slate-700 hover:bg-slate-900"
      onclick={() => {
        camera = { ...camera, scale: Math.min(camera.scale * 1.2, 5) }
      }}
      title="Zoom in"
    >
      +
    </button>
    <button
      type="button"
      class="toolbar-pill flex h-10 w-10 items-center justify-center transition hover:border-slate-700 hover:bg-slate-900"
      onclick={() => {
        camera = { ...camera, scale: Math.max(camera.scale * 0.8, 0.1) }
      }}
      title="Zoom out"
    >
      −
    </button>
    <button
      type="button"
      class="toolbar-pill flex h-10 w-10 items-center justify-center text-[11px] font-semibold transition hover:border-slate-700 hover:bg-slate-900"
      onclick={handleResetView}
      title="Reset view"
    >
      {Math.round(camera.scale * 100)}%
    </button>
  </div>
</div>
