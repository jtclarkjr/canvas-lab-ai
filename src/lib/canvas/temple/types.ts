import type {
  AnchorPosition,
  CanvasDrawableElement,
  CanvasElementType,
  ConnectorKind,
  DiagramConnector,
  DiagramFormatting,
  DiagramShape,
  Point,
  ShapeKind
} from '$lib/canvas/types'

export type DiagramTemplateId =
  | 'basic-flow'
  | 'decision-branch'
  | 'approval-loop'
  | 'swimlane-activity'

export type DiagramTemplateDefinition = {
  id: DiagramTemplateId
  label: string
  description: string
}

export type DiagramTemplateShapeSpec = {
  key: string
  kind: ShapeKind
  x: number
  y: number
  width: number
  height: number
  text: string
  textFontSize?: number
  textIsBold?: boolean
}

export type DiagramTemplateConnectorSpec = {
  key: string
  from: string
  fromAnchor: AnchorPosition
  to: string
  toAnchor: AnchorPosition
  text: string
  kind?: ConnectorKind
}

export type DiagramTemplateSpec = {
  width: number
  height: number
  shapes: DiagramTemplateShapeSpec[]
  connectors: DiagramTemplateConnectorSpec[]
}

export type BuiltDiagramTemplate = {
  width: number
  height: number
  shapes: DiagramShape[]
  connectors: DiagramConnector[]
  elements: Array<{
    element: CanvasDrawableElement
    type: CanvasElementType
  }>
}

export type BuildDiagramTemplateOptions = {
  center: Point
  formatting: DiagramFormatting
  createId?: () => string
  zStart?: number
}
