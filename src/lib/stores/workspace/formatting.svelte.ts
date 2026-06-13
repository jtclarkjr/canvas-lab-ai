import type {
  Arrowhead,
  ConnectorKind,
  DiagramFormatting,
  DrawFormatting,
  DrawStyle,
  ListStyle,
  ShapeKind,
  StrokeStyle,
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
  let diagramFormatting = $state<DiagramFormatting>({
    shapeKind: 'rectangle',
    connectorKind: 'straight',
    fillColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 2,
    strokeStyle: 'solid',
    opacity: 1,
    startArrow: 'none',
    endArrow: 'arrow'
  })

  function setTextFormatting(
    next: TextFormatting | ((previous: TextFormatting) => TextFormatting)
  ) {
    textFormatting = typeof next === 'function' ? next(textFormatting) : next
  }

  function setDrawFormatting(
    next: DrawFormatting | ((previous: DrawFormatting) => DrawFormatting)
  ) {
    drawFormatting = typeof next === 'function' ? next(drawFormatting) : next
  }

  function setDiagramFormatting(
    next:
      | DiagramFormatting
      | ((previous: DiagramFormatting) => DiagramFormatting)
  ) {
    diagramFormatting =
      typeof next === 'function' ? next(diagramFormatting) : next
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
    setTextFormatting((previous) => ({
      ...previous,
      isItalic: !previous.isItalic
    }))
  }

  function toggleTextUnderline() {
    setTextFormatting((previous) => ({
      ...previous,
      isUnderline: !previous.isUnderline
    }))
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

  function setShapeKind(shapeKind: ShapeKind) {
    setDiagramFormatting((previous) => ({ ...previous, shapeKind }))
  }

  function setConnectorKind(connectorKind: ConnectorKind) {
    setDiagramFormatting((previous) => ({ ...previous, connectorKind }))
  }

  function setDiagramFillColor(fillColor: string) {
    setDiagramFormatting((previous) => ({ ...previous, fillColor }))
  }

  function setDiagramStrokeColor(strokeColor: string) {
    setDiagramFormatting((previous) => ({ ...previous, strokeColor }))
  }

  function setDiagramStrokeWidth(strokeWidth: number) {
    setDiagramFormatting((previous) => ({ ...previous, strokeWidth }))
  }

  function setDiagramStrokeStyle(strokeStyle: StrokeStyle) {
    setDiagramFormatting((previous) => ({ ...previous, strokeStyle }))
  }

  function setDiagramOpacity(opacity: number) {
    setDiagramFormatting((previous) => ({ ...previous, opacity }))
  }

  function setDiagramStartArrow(startArrow: Arrowhead) {
    setDiagramFormatting((previous) => ({ ...previous, startArrow }))
  }

  function setDiagramEndArrow(endArrow: Arrowhead) {
    setDiagramFormatting((previous) => ({ ...previous, endArrow }))
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
    setShapeKind,
    setConnectorKind,
    setDiagramFillColor,
    setDiagramStrokeColor,
    setDiagramStrokeWidth,
    setDiagramStrokeStyle,
    setDiagramOpacity,
    setDiagramStartArrow,
    setDiagramEndArrow,
    get textFormatting() {
      return textFormatting
    },
    get drawFormatting() {
      return drawFormatting
    },
    get diagramFormatting() {
      return diagramFormatting
    }
  }
}
