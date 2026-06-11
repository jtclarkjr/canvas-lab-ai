export type Tool = 'select' | 'hand' | 'pencil' | 'eraser' | 'text'

export type Point = { x: number; y: number }

export type Path = {
  id: string
  points: Point[]
  color: string
  width: number
  opacity: number
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

export type EditingText = {
  id?: string
  x: number
  y: number
  value: string
}

export type Camera = {
  x: number
  y: number
  scale: number
}
