import { tick } from 'svelte'
import type { Command } from '$lib/canvas/commands'
import {
  createCreateTextCommand,
  createDeleteElementCommand,
  createUpdateMultipleCommand,
  createUpdateTextCommand
} from '$lib/canvas/commands'
import {
  getTextContentWidth,
  getTextLineHeight,
  getTextLines,
  textElementToData
} from '$lib/canvas/drawing-utils'
import {
  cloneConnector,
  connectorToData,
  getConnectorLabelPoint,
  shapeToData
} from '$lib/canvas/diagram-utils'
import type { UpsertElementInput } from '$lib/workspace/schema'
import type { Scene } from '$lib/scenes/schema'
import type {
  DiagramConnector,
  DiagramShape,
  EditingText,
  ListStyle,
  TextElement
} from '$lib/canvas/types'
import {
  continueListOnEnter,
  getSelectionListStyle,
  listStartValue,
  normalizeListText,
  toggleListStyle
} from '$lib/canvas/text-lists'
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

type WorkspaceTextEditorInput = {
  getActiveCanvasId: () => string
  getUserId: () => string
  getTextInputEl: () => HTMLTextAreaElement | null
  getTextElements: () => TextElement[]
  setTextElements: ElementSetter<TextElement>
  getShapes?: () => DiagramShape[]
  setShapes?: ElementSetter<DiagramShape>
  getConnectors?: () => DiagramConnector[]
  setConnectors?: ElementSetter<DiagramConnector>
  getScenes?: () => Scene[]
  getEditingText: () => EditingText | null
  setEditingText: (next: EditingText | null) => void
  getEditorSelection: () => { start: number; end: number }
  setEditorSelection: (next: { start: number; end: number }) => void
  setElementOwner: (id: string, ownerId: string | null) => void
  formattingStore: ReturnType<typeof createWorkspaceFormattingStore>
  addHistoryCommand: (command: Command) => void
  upsertElement: UpsertElementMutation
  deleteElement: DeleteElementMutation
}

export function createWorkspaceTextEditorStore({
  getActiveCanvasId,
  getUserId,
  getTextInputEl,
  getTextElements,
  setTextElements,
  getShapes,
  setShapes,
  getConnectors,
  setConnectors,
  getScenes,
  getEditingText,
  setEditingText,
  getEditorSelection,
  setEditorSelection,
  setElementOwner,
  formattingStore,
  addHistoryCommand,
  upsertElement,
  deleteElement
}: WorkspaceTextEditorInput) {
  let originalTextValue: TextElement | null = null
  let originalShapeValue: DiagramShape | null = null
  let originalConnectorValue: DiagramConnector | null = null

  const shapeTextPadding = 16
  const connectorTextMinWidth = 80

  function getShapesSafe() {
    return getShapes?.() ?? []
  }

  function getConnectorsSafe() {
    return getConnectors?.() ?? []
  }

  function getScenesSafe() {
    return getScenes?.() ?? []
  }

  const setShapesSafe: ElementSetter<DiagramShape> = (next) => {
    setShapes?.(next)
  }

  const setConnectorsSafe: ElementSetter<DiagramConnector> = (next) => {
    setConnectors?.(next)
  }

  function shapeLabelAsTextElement(shape: DiagramShape): TextElement {
    return {
      id: shape.id,
      text: shape.text ?? '',
      x: shape.x,
      y: shape.y,
      rotation: shape.rotation,
      color: shape.textColor ?? '#000000',
      fontSize: shape.textFontSize ?? 16,
      isBold: shape.textIsBold ?? false,
      isItalic: shape.textIsItalic ?? false,
      isUnderline: shape.textIsUnderline ?? false,
      z: shape.z
    }
  }

  function connectorLabelAsTextElement(
    connector: DiagramConnector
  ): TextElement {
    const point = getConnectorLabelPoint(
      connector,
      getShapesSafe(),
      getScenesSafe()
    )
    return {
      id: connector.id,
      text: connector.text ?? '',
      x: point.x,
      y: point.y,
      color: connector.textColor ?? '#000000',
      fontSize: connector.textFontSize ?? 16,
      isBold: connector.textIsBold ?? false,
      isItalic: connector.textIsItalic ?? false,
      isUnderline: connector.textIsUnderline ?? false,
      z: connector.z
    }
  }

  function shapeEditorFrame(shape: DiagramShape, value: string) {
    const fontSize =
      shape.textFontSize ?? formattingStore.textFormatting.fontSize
    const lineCount = getTextLines(value || '').length
    const textHeight = (lineCount - 1) * getTextLineHeight(fontSize) + fontSize
    return {
      x: shape.x + shapeTextPadding,
      y: shape.y + shape.height / 2 - textHeight / 2,
      width: Math.max(24, shape.width - shapeTextPadding * 2),
      rotation: shape.rotation
    }
  }

  function connectorEditorFrame(connector: DiagramConnector, value: string) {
    const fontSize =
      connector.textFontSize ?? formattingStore.textFormatting.fontSize
    const lines = getTextLines(value || '')
    const textHeight =
      (lines.length - 1) * getTextLineHeight(fontSize) + fontSize
    const width = Math.max(
      connectorTextMinWidth,
      getTextContentWidth(lines, fontSize) + 16
    )
    const point = getConnectorLabelPoint(
      connector,
      getShapesSafe(),
      getScenesSafe()
    )
    return {
      x: point.x - width / 2,
      y: point.y - textHeight / 2,
      width
    }
  }

  function commitText(text: EditingText | null) {
    if (!text?.id) return

    switch (text.target) {
      case 'shape':
        commitShapeText(text)
        return
      case 'connector':
        commitConnectorText(text)
        return
      default:
        commitStandaloneText(text)
    }
  }

  function commitStandaloneText(text: EditingText) {
    const textId = text.id
    if (!textId) return
    const value = normalizeListText(text.value)
    const previousTextValue = originalTextValue

    if (!value) {
      const wasCreate = !previousTextValue
      const existingText = getTextElements().find(
        (entry) => entry.id === textId
      )
      if (existingText && !wasCreate) {
        addHistoryCommand(
          createDeleteElementCommand(existingText, 'text', getUserId())
        )
      }
      setTextElements((previous) =>
        previous.filter((entry) => entry.id !== textId)
      )

      if (!wasCreate) {
        deleteElement.mutate({ id: textId })
      }

      setEditingText(null)
      return
    }

    const existingText = getTextElements().find((entry) => entry.id === textId)
    const textElement: TextElement = {
      id: textId,
      text: value,
      x: existingText?.x ?? text.x,
      y: existingText?.y ?? text.y,
      rotation: existingText?.rotation ?? text.rotation ?? 0,
      color: formattingStore.textFormatting.color,
      fontSize: formattingStore.textFormatting.fontSize,
      isBold: formattingStore.textFormatting.isBold,
      isItalic: formattingStore.textFormatting.isItalic,
      isUnderline: formattingStore.textFormatting.isUnderline,
      z: existingText?.z ?? previousTextValue?.z ?? Date.now()
    }

    if (existingText) {
      setTextElements((previous) =>
        previous.map((entry) => (entry.id === textId ? textElement : entry))
      )
    } else {
      setTextElements((previous) => [...previous, textElement])
    }

    const wasCreate = !previousTextValue
    if (wasCreate) {
      addHistoryCommand(createCreateTextCommand(textElement, getUserId()))
    }
    if (!wasCreate && previousTextValue) {
      addHistoryCommand(
        createUpdateTextCommand(
          textId,
          previousTextValue,
          textElement,
          getUserId()
        )
      )
    }

    setEditingText(null)

    upsertElement.mutate(
      {
        id: textId,
        canvasId: getActiveCanvasId(),
        type: 'text',
        data: textElementToData(textElement),
        x: textElement.x,
        y: textElement.y,
        z: textElement.z ?? Date.now()
      },
      {
        onError: () => {
          if (wasCreate) {
            setTextElements((previous) =>
              previous.filter((entry) => entry.id !== textId)
            )
            return
          }
          if (previousTextValue) {
            setTextElements((previous) =>
              previous.map((entry) =>
                entry.id === textId ? previousTextValue : entry
              )
            )
          }
        }
      }
    )
  }

  function commitShapeText(text: EditingText) {
    if (!text.id) return
    const existingShape = getShapesSafe().find((entry) => entry.id === text.id)
    const previousShapeValue = originalShapeValue
    if (!existingShape || !previousShapeValue) {
      setEditingText(null)
      originalShapeValue = null
      return
    }

    const value = normalizeListText(text.value)
    const after: DiagramShape = {
      ...existingShape,
      text: value,
      textColor: formattingStore.textFormatting.color,
      textFontSize: formattingStore.textFormatting.fontSize,
      textIsBold: formattingStore.textFormatting.isBold,
      textIsItalic: formattingStore.textFormatting.isItalic,
      textIsUnderline: formattingStore.textFormatting.isUnderline
    }

    setShapesSafe((previous) =>
      previous.map((entry) => (entry.id === after.id ? after : entry))
    )
    addHistoryCommand(
      createUpdateMultipleCommand(
        [
          {
            id: after.id,
            type: 'shape',
            before: previousShapeValue,
            after
          }
        ],
        getUserId()
      )
    )

    setEditingText(null)
    originalShapeValue = null

    upsertElement.mutate(
      {
        id: after.id,
        canvasId: getActiveCanvasId(),
        type: 'shape',
        data: shapeToData(after),
        x: after.x,
        y: after.y,
        z: after.z ?? Date.now()
      },
      {
        onError: () => {
          setShapesSafe((previous) =>
            previous.map((entry) =>
              entry.id === previousShapeValue.id ? previousShapeValue : entry
            )
          )
        }
      }
    )
  }

  function commitConnectorText(text: EditingText) {
    if (!text.id) return
    const existingConnector = getConnectorsSafe().find(
      (entry) => entry.id === text.id
    )
    const previousConnectorValue = originalConnectorValue
    if (!existingConnector || !previousConnectorValue) {
      setEditingText(null)
      originalConnectorValue = null
      return
    }

    const value = normalizeListText(text.value)
    const after: DiagramConnector = {
      ...existingConnector,
      text: value,
      textColor: formattingStore.textFormatting.color,
      textFontSize: formattingStore.textFormatting.fontSize,
      textIsBold: formattingStore.textFormatting.isBold,
      textIsItalic: formattingStore.textFormatting.isItalic,
      textIsUnderline: formattingStore.textFormatting.isUnderline
    }

    setConnectorsSafe((previous) =>
      previous.map((entry) => (entry.id === after.id ? after : entry))
    )
    addHistoryCommand(
      createUpdateMultipleCommand(
        [
          {
            id: after.id,
            type: 'connector',
            before: previousConnectorValue,
            after
          }
        ],
        getUserId()
      )
    )

    setEditingText(null)
    originalConnectorValue = null

    upsertElement.mutate(
      {
        id: after.id,
        canvasId: getActiveCanvasId(),
        type: 'connector',
        data: connectorToData(after),
        x: 0,
        y: 0,
        z: after.z ?? Date.now()
      },
      {
        onError: () => {
          setConnectorsSafe((previous) =>
            previous.map((entry) =>
              entry.id === previousConnectorValue.id
                ? previousConnectorValue
                : entry
            )
          )
        }
      }
    )
  }

  function startTextEditingAtPosition(
    x: number,
    y: number,
    value: string,
    id?: string
  ) {
    const textId = id ?? crypto.randomUUID()
    let initialValue = value
    const existing = id
      ? getTextElements().find((entry) => entry.id === id)
      : null

    if (id) {
      originalTextValue = existing ? { ...existing } : null
      originalShapeValue = null
      originalConnectorValue = null
    } else {
      originalTextValue = null
      originalShapeValue = null
      originalConnectorValue = null
      setElementOwner(textId, getUserId())
      if (!value) {
        initialValue = listStartValue(formattingStore.textFormatting.listStyle)
      }
      const placeholder: TextElement = {
        id: textId,
        text: initialValue,
        x,
        y,
        rotation: 0,
        color: formattingStore.textFormatting.color,
        fontSize: formattingStore.textFormatting.fontSize,
        isBold: formattingStore.textFormatting.isBold,
        isItalic: formattingStore.textFormatting.isItalic,
        isUnderline: formattingStore.textFormatting.isUnderline,
        z: Date.now()
      }
      setTextElements((previous) => [...previous, placeholder])
    }

    setEditingText({
      id: textId,
      target: 'text',
      x,
      y,
      value: initialValue,
      rotation: existing?.rotation ?? 0
    })

    queueMicrotask(() => {
      const textInputEl = getTextInputEl()
      textInputEl?.focus()
      if (id && initialValue) {
        textInputEl?.select()
        syncEditorSelection()
        return
      }
      if (initialValue) {
        textInputEl?.setSelectionRange(initialValue.length, initialValue.length)
      }
      syncEditorSelection()
    })
  }

  function startShapeTextEditing(shape: DiagramShape) {
    const initialValue = shape.text ?? ''
    const frame = shapeEditorFrame(shape, initialValue)
    originalTextValue = null
    originalShapeValue = { ...shape }
    originalConnectorValue = null
    formattingStore.syncTextFormattingFromElement(
      shapeLabelAsTextElement(shape)
    )

    setEditingText({
      id: shape.id,
      target: 'shape',
      x: frame.x,
      y: frame.y,
      value: initialValue,
      width: frame.width,
      rotation: frame.rotation,
      textAlign: 'center'
    })

    queueMicrotask(() => {
      const textInputEl = getTextInputEl()
      textInputEl?.focus()
      if (initialValue) {
        textInputEl?.select()
      }
      syncEditorSelection()
    })
  }

  function startConnectorTextEditing(connector: DiagramConnector) {
    const initialValue = connector.text ?? ''
    const frame = connectorEditorFrame(connector, initialValue)
    originalTextValue = null
    originalShapeValue = null
    originalConnectorValue = cloneConnector(connector)
    formattingStore.syncTextFormattingFromElement(
      connectorLabelAsTextElement(connector)
    )

    setEditingText({
      id: connector.id,
      target: 'connector',
      x: frame.x,
      y: frame.y,
      value: initialValue,
      width: frame.width,
      textAlign: 'center'
    })

    queueMicrotask(() => {
      const textInputEl = getTextInputEl()
      textInputEl?.focus()
      if (initialValue) {
        textInputEl?.select()
      }
      syncEditorSelection()
    })
  }

  function syncEditorSelection() {
    const textInputEl = getTextInputEl()
    if (!textInputEl) return
    setEditorSelection({
      start: textInputEl.selectionStart ?? 0,
      end: textInputEl.selectionEnd ?? 0
    })
  }

  function applyEditorValue(value: string) {
    const editingText = getEditingText()
    setEditingText(editingText ? { ...editingText, value } : editingText)

    switch (editingText?.target) {
      case 'shape':
        setShapesSafe((previous) =>
          previous.map((entry) =>
            entry.id === editingText.id ? { ...entry, text: value } : entry
          )
        )
        break
      case 'connector':
        setConnectorsSafe((previous) =>
          previous.map((entry) =>
            entry.id === editingText.id ? { ...entry, text: value } : entry
          )
        )
        break
      default:
        setTextElements((previous) =>
          previous.map((entry) =>
            entry.id === getEditingText()?.id
              ? { ...entry, text: value }
              : entry
          )
        )
        break
    }
  }

  async function handleListStyleToggle(style: Exclude<ListStyle, 'none'>) {
    const editingText = getEditingText()
    const textInputEl = getTextInputEl()
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
    formattingStore.setTextListStyle(
      formattingStore.textFormatting.listStyle === style ? 'none' : style
    )
  }

  async function handleTextEditorKeydown(event: KeyboardEvent) {
    const editingText = getEditingText()
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
        getTextInputEl()?.setSelectionRange(result.caret, result.caret)
        syncEditorSelection()
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      switch (editingText?.target) {
        case 'shape':
          if (originalShapeValue) {
            setShapesSafe((previous) =>
              previous.map((entry) =>
                entry.id === originalShapeValue?.id ? originalShapeValue : entry
              )
            )
          }
          setEditingText(null)
          originalShapeValue = null
          return
        case 'connector':
          if (originalConnectorValue) {
            setConnectorsSafe((previous) =>
              previous.map((entry) =>
                entry.id === originalConnectorValue?.id
                  ? originalConnectorValue
                  : entry
              )
            )
          }
          setEditingText(null)
          originalConnectorValue = null
          return
        default:
          break
      }
      if (editingText?.id) {
        const existing = getTextElements().find(
          (entry) => entry.id === editingText?.id
        )
        if (existing && !normalizeListText(existing.text)) {
          setTextElements((previous) =>
            previous.filter((entry) => entry.id !== editingText?.id)
          )
        }
      }
      setEditingText(null)
    }
  }

  function handleTextInputBlur(event: FocusEvent) {
    const editingText = getEditingText()
    if (!editingText) return

    const relatedTarget =
      event.relatedTarget instanceof Element ? event.relatedTarget : null
    if (relatedTarget?.closest('[data-text-formatting-toolbar]')) {
      return
    }

    queueMicrotask(() => {
      const nextFocused =
        document.activeElement instanceof Element
          ? document.activeElement
          : null

      if (nextFocused?.closest('[data-text-formatting-toolbar]')) {
        return
      }

      commitText(editingText)
    })
  }

  return {
    commitText,
    startTextEditingAtPosition,
    startShapeTextEditing,
    startConnectorTextEditing,
    syncEditorSelection,
    applyEditorValue,
    handleListStyleToggle,
    handleTextEditorKeydown,
    handleTextInputBlur,
    get activeListStyle() {
      const editingText = getEditingText()
      const editorSelection = getEditorSelection()
      return editingText
        ? getSelectionListStyle(
            editingText.value,
            editorSelection.start,
            editorSelection.end
          )
        : formattingStore.textFormatting.listStyle
    }
  }
}
