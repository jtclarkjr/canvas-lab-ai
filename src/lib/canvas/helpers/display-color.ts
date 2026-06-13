const pureBlackValues = new Set([
  '#000',
  '#000000',
  'black',
  'rgb(0,0,0)',
  'rgb(0 0 0)'
])

const transparentValues = new Set(['transparent', 'none', ''])

export function resolveCanvasDisplayColor(
  color: string | null | undefined
): string {
  const normalized = color?.trim()

  if (!normalized || pureBlackValues.has(normalized.toLowerCase())) {
    return 'var(--canvas-ink)'
  }

  return normalized
}

// For text rendered inside a filled shape: if the fill is an opaque explicit
// color (like white), black text must stay black rather than being remapped to
// --canvas-ink (which is light in dark mode and invisible on white shapes).
export function resolveTextColorOnFill(
  textColor: string | null | undefined,
  fillColor: string | null | undefined
): string {
  const normalizedFill = fillColor?.trim().toLowerCase()
  if (
    normalizedFill &&
    !transparentValues.has(normalizedFill) &&
    !pureBlackValues.has(normalizedFill)
  ) {
    return textColor ?? '#000000'
  }
  return resolveCanvasDisplayColor(textColor)
}
