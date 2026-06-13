export type Tool =
  | 'select'
  | 'hand'
  | 'pencil'
  | 'eraser'
  | 'text'
  | 'shape'
  | 'connector'

export type Point = { x: number; y: number }

export type Path = {
  id: string
  points: Point[]
  color: string
  width: number
  opacity: number
  z?: number | null
}

export type ListStyle = 'none' | 'bullet' | 'number'

export type TextElement = {
  id: string
  text: string
  x: number
  y: number
  color: string
  fontSize: number
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
  z?: number | null
}

export type TextFormatting = {
  fontSize: number
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
  color: string
  listStyle: ListStyle
}

export type DrawStyle = 'freeform' | 'straight'

export type DrawFormatting = {
  width: number
  color: string
  style: DrawStyle
  isHighlighter: boolean
  highlighterOpacity: number
}

export type ShapeKind = 'rectangle' | 'diamond' | 'ellipse'

export type ConnectorKind = 'straight' | 'elbow' | 'curved'

export type StrokeStyle = 'solid' | 'dashed' | 'dotted'

export type Arrowhead = 'none' | 'arrow'

export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left'

export type CanvasElementType = 'path' | 'text' | 'shape' | 'connector'

export type DiagramAnchorBinding = {
  shapeId: string
  anchor: AnchorPosition
}

export type DiagramEndpoint = {
  x: number
  y: number
  binding?: DiagramAnchorBinding | null
}

export type DiagramShape = {
  id: string
  kind: ShapeKind
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fillColor: string
  strokeColor: string
  strokeWidth: number
  strokeStyle: StrokeStyle
  opacity: number
  text?: string
  textColor?: string
  textFontSize?: number
  textIsBold?: boolean
  textIsItalic?: boolean
  textIsUnderline?: boolean
  z?: number | null
}

export type DiagramConnector = {
  id: string
  kind: ConnectorKind
  start: DiagramEndpoint
  end: DiagramEndpoint
  strokeColor: string
  strokeWidth: number
  strokeStyle: StrokeStyle
  opacity: number
  startArrow: Arrowhead
  endArrow: Arrowhead
  z?: number | null
}

export type DiagramElement = DiagramShape | DiagramConnector

export type CanvasDrawableElement =
  | Path
  | TextElement
  | DiagramShape
  | DiagramConnector

export type DiagramFormatting = {
  shapeKind: ShapeKind
  connectorKind: ConnectorKind
  fillColor: string
  strokeColor: string
  strokeWidth: number
  strokeStyle: StrokeStyle
  opacity: number
  startArrow: Arrowhead
  endArrow: Arrowhead
}

export type EditingText = {
  id?: string
  target?: 'text' | 'shape'
  x: number
  y: number
  value: string
  width?: number
  rotation?: number
  textAlign?: 'left' | 'center'
}

export type Camera = {
  x: number
  y: number
  scale: number
}
