import { describe, expect, it } from 'vite-plus/test'
import {
  applyLegacyListStyle,
  continueListOnEnter,
  getLineMarker,
  getSelectionListStyle,
  normalizeListText,
  renumberLines,
  stripLineMarker,
  toggleListStyle
} from '$lib/canvas/text-lists'

describe('line markers', () => {
  it('detects bullet, number, and plain lines', () => {
    expect(getLineMarker('• hello')).toBe('bullet')
    expect(getLineMarker('12. hello')).toBe('number')
    expect(getLineMarker('hello')).toBe('none')
  })

  it('strips markers without touching plain lines', () => {
    expect(stripLineMarker('• hello')).toBe('hello')
    expect(stripLineMarker('2. hello')).toBe('hello')
    expect(stripLineMarker('hello')).toBe('hello')
  })
})

describe('renumberLines', () => {
  it('renumbers consecutive runs from 1 and keeps blanks inside a run', () => {
    expect(renumberLines(['5. a', '', '9. b'])).toEqual(['1. a', '', '2. b'])
  })

  it('restarts numbering after a plain line', () => {
    expect(renumberLines(['1. a', 'plain', '7. b'])).toEqual(['1. a', 'plain', '1. b'])
  })
})

describe('toggleListStyle', () => {
  it('bullets only the lines covered by the selection', () => {
    const text = 'one\ntwo\nthree'
    const result = toggleListStyle(text, 0, 'one\ntwo'.length, 'bullet')
    expect(result.text).toBe('• one\n• two\nthree')
  })

  it('removes markers when every selected line already has them', () => {
    const text = '• one\n• two'
    const result = toggleListStyle(text, 0, text.length, 'bullet')
    expect(result.text).toBe('one\ntwo')
  })

  it('converts mixed selections to the clicked style and renumbers', () => {
    const text = '• one\n2. two\nthree'
    const result = toggleListStyle(text, 0, text.length, 'number')
    expect(result.text).toBe('1. one\n2. two\n3. three')
  })

  it('applies to the cursor line only when nothing is selected', () => {
    const text = 'one\ntwo'
    const caret = 'one\ntw'.length
    const result = toggleListStyle(text, caret, caret, 'bullet')
    expect(result.text).toBe('one\n• two')
    expect(result.selectionStart).toBe(caret + '• '.length)
  })

  it('skips blank lines in multi-line selections', () => {
    const text = 'one\n\ntwo'
    const result = toggleListStyle(text, 0, text.length, 'number')
    expect(result.text).toBe('1. one\n\n2. two')
  })

  it('excludes a line when the selection ends exactly at its start', () => {
    const text = 'one\ntwo'
    const result = toggleListStyle(text, 0, 'one\n'.length, 'bullet')
    expect(result.text).toBe('• one\ntwo')
  })

  it('renumbers an adjacent run when new numbered lines join it', () => {
    const text = 'one\n1. two'
    const result = toggleListStyle(text, 0, 1, 'number')
    expect(result.text).toBe('1. one\n2. two')
  })
})

describe('getSelectionListStyle', () => {
  it('reports the shared marker of the selected lines', () => {
    expect(getSelectionListStyle('• a\n• b', 0, 7)).toBe('bullet')
    expect(getSelectionListStyle('1. a\n2. b', 0, 9)).toBe('number')
    expect(getSelectionListStyle('• a\nb', 0, 5)).toBe('none')
  })
})

describe('continueListOnEnter', () => {
  it('returns null on plain lines so the editor inserts a newline natively', () => {
    expect(continueListOnEnter('hello', 5, 5)).toBeNull()
  })

  it('continues a bullet list on the next line', () => {
    const text = '• one'
    const result = continueListOnEnter(text, text.length, text.length)
    expect(result?.text).toBe('• one\n• ')
    expect(result?.caret).toBe('• one\n• '.length)
  })

  it('continues a numbered list and renumbers following items', () => {
    const text = '1. one\n2. two'
    const caret = '1. one'.length
    const result = continueListOnEnter(text, caret, caret)
    expect(result?.text).toBe('1. one\n2. \n3. two')
    expect(result?.caret).toBe('1. one\n2. '.length)
  })

  it('exits the list when the current item is empty', () => {
    const text = '• one\n• '
    const result = continueListOnEnter(text, text.length, text.length)
    expect(result?.text).toBe('• one\n')
    expect(result?.caret).toBe(text.length - '• '.length)
  })
})

describe('normalizeListText', () => {
  it('drops trailing blank and marker-only lines and renumbers', () => {
    expect(normalizeListText('3. one\n7. two\n3. \n')).toBe('1. one\n2. two')
  })

  it('returns an empty string when only markers remain', () => {
    expect(normalizeListText('• ')).toBe('')
    expect(normalizeListText('  \n')).toBe('')
  })
})

describe('applyLegacyListStyle', () => {
  it('bakes element-level bullet style into the text once', () => {
    expect(applyLegacyListStyle('a\n\nb', 'bullet')).toBe('• a\n\n• b')
  })

  it('numbers non-empty lines for legacy numbered elements', () => {
    expect(applyLegacyListStyle('a\n\nb', 'number')).toBe('1. a\n\n2. b')
  })

  it('leaves text untouched without a legacy style', () => {
    expect(applyLegacyListStyle('a\nb', 'none')).toBe('a\nb')
    expect(applyLegacyListStyle('a\nb', undefined)).toBe('a\nb')
  })
})
