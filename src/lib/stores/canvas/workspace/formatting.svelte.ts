import type {
  DrawFormatting,
  DrawStyle,
  ListStyle,
  TextElement,
  TextFormatting
} from '$lib/canvas/types'

export function createWorkspaceFormattingStore() {
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

  function setTextFormatting(
    next: TextFormatting | ((previous: TextFormatting) => TextFormatting)
  ) {
    textFormatting = typeof next === 'function' ? next(textFormatting) : next
  }

  function setDrawFormatting(next: DrawFormatting | ((previous: DrawFormatting) => DrawFormatting)) {
    drawFormatting = typeof next === 'function' ? next(drawFormatting) : next
  }

  function syncTextFormattingFromElement(element: TextElement) {
    setTextFormatting((previous) => ({
      fontSize: element.fontSize,
      isBold: element.isBold,
      isItalic: element.isItalic,
      isUnderline: element.isUnderline,
      color: element.color,
      listStyle: previous.listStyle
    }))
  }

  function setTextListStyle(listStyle: ListStyle) {
    setTextFormatting((previous) => ({ ...previous, listStyle }))
  }

  function setTextFontSize(fontSize: number) {
    setTextFormatting((previous) => ({ ...previous, fontSize }))
  }

  function toggleTextBold() {
    setTextFormatting((previous) => ({ ...previous, isBold: !previous.isBold }))
  }

  function toggleTextItalic() {
    setTextFormatting((previous) => ({ ...previous, isItalic: !previous.isItalic }))
  }

  function toggleTextUnderline() {
    setTextFormatting((previous) => ({ ...previous, isUnderline: !previous.isUnderline }))
  }

  function setTextColor(color: string) {
    setTextFormatting((previous) => ({ ...previous, color }))
  }

  function setDrawWidth(width: number) {
    setDrawFormatting((previous) => ({ ...previous, width }))
  }

  function setDrawColor(color: string) {
    setDrawFormatting((previous) => ({ ...previous, color }))
  }

  function setDrawStyle(style: DrawStyle) {
    setDrawFormatting((previous) => ({ ...previous, style }))
  }

  function toggleHighlighter() {
    setDrawFormatting((previous) => ({
      ...previous,
      isHighlighter: !previous.isHighlighter
    }))
  }

  function setHighlighterOpacity(highlighterOpacity: number) {
    setDrawFormatting((previous) => ({ ...previous, highlighterOpacity }))
  }

  return {
    setTextListStyle,
    syncTextFormattingFromElement,
    setTextFontSize,
    toggleTextBold,
    toggleTextItalic,
    toggleTextUnderline,
    setTextColor,
    setDrawWidth,
    setDrawColor,
    setDrawStyle,
    toggleHighlighter,
    setHighlighterOpacity,
    get textFormatting() {
      return textFormatting
    },
    get drawFormatting() {
      return drawFormatting
    }
  }
}
