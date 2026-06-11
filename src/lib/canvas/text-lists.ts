import type { ListStyle } from '$lib/canvas/types'

export const BULLET_PREFIX = '• '
const NUMBER_PREFIX = /^(\d+)\. /

export function getLineMarker(line: string): ListStyle {
  if (line.startsWith(BULLET_PREFIX)) return 'bullet'
  if (NUMBER_PREFIX.test(line)) return 'number'
  return 'none'
}

export function stripLineMarker(line: string): string {
  if (line.startsWith(BULLET_PREFIX)) return line.slice(BULLET_PREFIX.length)
  return line.replace(NUMBER_PREFIX, '')
}

export function listStartValue(style: ListStyle): string {
  if (style === 'bullet') return BULLET_PREFIX
  if (style === 'number') return '1. '
  return ''
}

// Consecutive numbered lines form a run that counts up from 1. Blank lines sit
// inside a run without taking a number; bullet or plain lines end the run.
export function renumberLines(lines: string[]): string[] {
  let count = 0
  return lines.map((line) => {
    if (!line) return line
    if (getLineMarker(line) === 'number') {
      count += 1
      return `${count}. ${stripLineMarker(line)}`
    }
    count = 0
    return line
  })
}

function lineStartOffsets(lines: string[]): number[] {
  const starts: number[] = []
  let offset = 0
  for (const line of lines) {
    starts.push(offset)
    offset += line.length + 1
  }
  return starts
}

function lineIndexAt(starts: number[], position: number): number {
  for (let i = starts.length - 1; i >= 0; i -= 1) {
    if (position >= (starts[i] ?? 0)) return i
  }
  return 0
}

// Lines touched by the selection. A selection ending exactly at the start of a
// line does not include that line; blank lines are skipped unless the
// selection sits on a single line.
function getTargetLines(
  lines: string[],
  starts: number[],
  selectionStart: number,
  selectionEnd: number
): number[] {
  const from = Math.min(selectionStart, selectionEnd)
  const to = Math.max(selectionStart, selectionEnd)
  const first = lineIndexAt(starts, from)
  let last = lineIndexAt(starts, to)
  if (last > first && to === starts[last]) last -= 1

  const targets: number[] = []
  for (let i = first; i <= last; i += 1) {
    if (first === last || (lines[i] ?? '').length > 0) targets.push(i)
  }
  return targets
}

export function getSelectionListStyle(
  text: string,
  selectionStart: number,
  selectionEnd: number
): ListStyle {
  const lines = text.split('\n')
  const starts = lineStartOffsets(lines)
  const targets = getTargetLines(lines, starts, selectionStart, selectionEnd)
  const markers = targets.map((i) => getLineMarker(lines[i] ?? ''))
  if (markers.length > 0 && markers.every((marker) => marker === 'bullet')) return 'bullet'
  if (markers.length > 0 && markers.every((marker) => marker === 'number')) return 'number'
  return 'none'
}

export function toggleListStyle(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  style: Exclude<ListStyle, 'none'>
): { text: string; selectionStart: number; selectionEnd: number } {
  const lines = text.split('\n')
  const starts = lineStartOffsets(lines)
  const targets = new Set(getTargetLines(lines, starts, selectionStart, selectionEnd))
  const removing =
    targets.size > 0 && [...targets].every((i) => getLineMarker(lines[i] ?? '') === style)

  const toggled = lines.map((line, i) => {
    if (!targets.has(i)) return line
    const content = stripLineMarker(line)
    if (removing) return content
    return style === 'bullet' ? `${BULLET_PREFIX}${content}` : `1. ${content}`
  })
  const next = renumberLines(toggled)
  const nextStarts = lineStartOffsets(next)

  const mapPosition = (position: number) => {
    const index = lineIndexAt(starts, position)
    const column = position - (starts[index] ?? 0)
    const newLength = (next[index] ?? '').length
    const delta = newLength - (lines[index] ?? '').length
    return (nextStarts[index] ?? 0) + Math.max(0, Math.min(column + delta, newLength))
  }

  return {
    text: next.join('\n'),
    selectionStart: mapPosition(selectionStart),
    selectionEnd: mapPosition(selectionEnd)
  }
}

// Shift+Enter behavior inside a list line. Returns null when the line has no
// marker, letting the editor insert a plain newline natively.
export function continueListOnEnter(
  text: string,
  selectionStart: number,
  selectionEnd: number
): { text: string; caret: number } | null {
  const lines = text.split('\n')
  const starts = lineStartOffsets(lines)
  const from = Math.min(selectionStart, selectionEnd)
  const to = Math.max(selectionStart, selectionEnd)
  const index = lineIndexAt(starts, from)
  const line = lines[index] ?? ''
  const marker = getLineMarker(line)
  if (marker === 'none') return null

  if (from === to && !stripLineMarker(line).trim()) {
    // Enter on an empty list item exits the list instead of continuing it.
    const next = [...lines]
    next[index] = stripLineMarker(line)
    const renumbered = renumberLines(next)
    const nextStarts = lineStartOffsets(renumbered)
    return {
      text: renumbered.join('\n'),
      caret: (nextStarts[index] ?? 0) + (renumbered[index] ?? '').length
    }
  }

  const continuation = marker === 'bullet' ? BULLET_PREFIX : '1. '
  const inserted = `${text.slice(0, from)}\n${continuation}${text.slice(to)}`
  const renumbered = renumberLines(inserted.split('\n'))
  const nextStarts = lineStartOffsets(renumbered)
  const newLine = renumbered[index + 1] ?? ''
  const markerLength = newLine.length - stripLineMarker(newLine).length
  return {
    text: renumbered.join('\n'),
    caret: (nextStarts[index + 1] ?? 0) + markerLength
  }
}

// Commit-time cleanup: drop leading blank lines and trailing blank or
// marker-only lines, then renumber. Returns '' when nothing real remains.
export function normalizeListText(text: string): string {
  const lines = text.split('\n')
  while (lines.length > 0 && !(lines[0] ?? '').trim()) lines.shift()
  while (lines.length > 0 && !stripLineMarker(lines[lines.length - 1] ?? '').trim()) lines.pop()
  return renumberLines(lines).join('\n')
}

// Elements saved while list style was an element-level property have clean
// text and a listStyle flag; bake the markers in once on read.
export function applyLegacyListStyle(text: string, listStyle?: string): string {
  if (listStyle !== 'bullet' && listStyle !== 'number') return text
  let count = 0
  return text
    .split('\n')
    .map((line) => {
      if (!line) return line
      if (listStyle === 'bullet') return `${BULLET_PREFIX}${line}`
      count += 1
      return `${count}. ${line}`
    })
    .join('\n')
}
