import { tick } from 'svelte'
import type { Command } from '$lib/canvas/commands'
import {
  createCreateTextCommand,
  createDeleteElementCommand,
  createUpdateTextCommand
} from '$lib/canvas/commands'
import { textElementToData } from '$lib/canvas/drawing-utils'
import type { UpsertElementInput } from '$lib/canvas/schema'
import type { EditingText, ListStyle, TextElement } from '$lib/canvas/types'
import {
  continueListOnEnter,
  getSelectionListStyle,
  listStartValue,
  normalizeListText,
  toggleListStyle
} from '$lib/canvas/text-lists'
import type { createWorkspaceFormattingStore } from '$lib/stores/canvas/workspace/formatting.svelte'

type ElementSetter<T> = (next: T[] | ((previous: T[]) => T[])) => void

type UpsertElementMutation = {
  mutate(variables: UpsertElementInput, options?: { onError?: (error: unknown) => void }): void
}

type DeleteElementMutation = {
  mutate(variables: { id: string }, options?: { onError?: (error: unknown) => void }): void
}

type WorkspaceTextEditorInput = {
  getActiveCanvasId: () => string
  getUserId: () => string
  getTextInputEl: () => HTMLTextAreaElement | null
  getTextElements: () => TextElement[]
  setTextElements: ElementSetter<TextElement>
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

  function commitText(text: EditingText | null) {
    if (!text?.id) return
    const value = normalizeListText(text.value)
    const previousTextValue = originalTextValue

    if (!value) {
      const wasCreate = !previousTextValue
      const existingText = getTextElements().find((entry) => entry.id === text.id)
      if (existingText && !wasCreate) {
        addHistoryCommand(createDeleteElementCommand(existingText, 'text', getUserId()))
      }
      setTextElements((previous) => previous.filter((entry) => entry.id !== text.id))

      if (!wasCreate) {
        deleteElement.mutate({ id: text.id })
      }

      setEditingText(null)
      return
    }

    const existingText = getTextElements().find((entry) => entry.id === text.id)
    const textElement: TextElement = {
      id: text.id,
      text: value,
      x: existingText?.x ?? text.x,
      y: existingText?.y ?? text.y,
      color: formattingStore.textFormatting.color,
      fontSize: formattingStore.textFormatting.fontSize,
      isBold: formattingStore.textFormatting.isBold,
      isItalic: formattingStore.textFormatting.isItalic,
      isUnderline: formattingStore.textFormatting.isUnderline
    }

    if (existingText) {
      setTextElements((previous) =>
        previous.map((entry) => (entry.id === text.id ? textElement : entry))
      )
    } else {
      setTextElements((previous) => [...previous, textElement])
    }

    const wasCreate = !previousTextValue
    if (wasCreate) {
      addHistoryCommand(createCreateTextCommand(textElement, getUserId()))
    } else if (previousTextValue) {
      addHistoryCommand(createUpdateTextCommand(text.id, previousTextValue, textElement, getUserId()))
    }

    setEditingText(null)

    upsertElement.mutate(
      {
        id: text.id,
        canvasId: getActiveCanvasId(),
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
          } else if (previousTextValue) {
            setTextElements((previous) =>
              previous.map((entry) => (entry.id === text.id ? previousTextValue : entry))
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
      const existing = getTextElements().find((entry) => entry.id === id)
      originalTextValue = existing ? { ...existing } : null
    } else {
      originalTextValue = null
      setElementOwner(textId, getUserId())
      if (!value) {
        initialValue = listStartValue(formattingStore.textFormatting.listStyle)
      }
      const placeholder: TextElement = {
        id: textId,
        text: initialValue,
        x,
        y,
        color: formattingStore.textFormatting.color,
        fontSize: formattingStore.textFormatting.fontSize,
        isBold: formattingStore.textFormatting.isBold,
        isItalic: formattingStore.textFormatting.isItalic,
        isUnderline: formattingStore.textFormatting.isUnderline
      }
      setTextElements((previous) => [...previous, placeholder])
    }

    setEditingText({ id: textId, x, y, value: initialValue })

    queueMicrotask(() => {
      const textInputEl = getTextInputEl()
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
    setTextElements((previous) =>
      previous.map((entry) => (entry.id === getEditingText()?.id ? { ...entry, text: value } : entry))
    )
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
    } else if (event.key === 'Escape') {
      event.preventDefault()
      if (editingText?.id) {
        const existing = getTextElements().find((entry) => entry.id === editingText?.id)
        if (existing && !normalizeListText(existing.text)) {
          setTextElements((previous) => previous.filter((entry) => entry.id !== editingText?.id))
        }
      }
      setEditingText(null)
    }
  }

  function handleTextInputBlur(event: FocusEvent) {
    const editingText = getEditingText()
    if (!editingText) return

    const relatedTarget = event.relatedTarget instanceof Element ? event.relatedTarget : null
    if (relatedTarget?.closest('[data-text-formatting-toolbar]')) {
      return
    }

    queueMicrotask(() => {
      const nextFocused = document.activeElement instanceof Element ? document.activeElement : null

      if (nextFocused?.closest('[data-text-formatting-toolbar]')) {
        return
      }

      commitText(editingText)
    })
  }

  return {
    commitText,
    startTextEditingAtPosition,
    syncEditorSelection,
    applyEditorValue,
    handleListStyleToggle,
    handleTextEditorKeydown,
    handleTextInputBlur,
    get activeListStyle() {
      const editingText = getEditingText()
      const editorSelection = getEditorSelection()
      return editingText
        ? getSelectionListStyle(editingText.value, editorSelection.start, editorSelection.end)
        : formattingStore.textFormatting.listStyle
    }
  }
}
