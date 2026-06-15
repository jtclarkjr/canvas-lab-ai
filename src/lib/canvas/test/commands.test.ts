import { describe, expect, it } from 'vite-plus/test'
import {
  createCreateMultipleCommand,
  createCreatePathCommand,
  createCreateShapeCommand,
  createDeleteMultipleCommand,
  createMoveElementCommand,
  createUpdateMultipleCommand,
  createUpdateTextCommand,
  getInverseCommand
} from '$lib/canvas/commands'
import type { DiagramShape, Path, TextElement } from '$lib/canvas/types'

describe('canvas commands', () => {
  it('inverts create-path into delete-element', () => {
    const path: Path = {
      id: 'path-1',
      points: [{ x: 1, y: 2 }],
      color: '#000000',
      width: 2,
      opacity: 1
    }

    const command = createCreatePathCommand(path, 'user-1')
    const inverse = getInverseCommand(command)

    expect(inverse.type).toBe('DELETE_ELEMENT')
    if (inverse.type === 'DELETE_ELEMENT') {
      expect(inverse.element.id).toBe(path.id)
      expect(inverse.elementType).toBe('path')
    }
  })

  it('swaps before and after for move-element undo', () => {
    const command = createMoveElementCommand(
      'text-1',
      'text',
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      'user-1'
    )

    const inverse = getInverseCommand(command)

    expect(inverse.type).toBe('MOVE_ELEMENT')
    if (inverse.type === 'MOVE_ELEMENT') {
      expect(inverse.before).toEqual({ x: 30, y: 40 })
      expect(inverse.after).toEqual({ x: 10, y: 20 })
    }
  })

  it('preserves multiline list text in update-text commands', () => {
    const before: TextElement = {
      id: 'text-1',
      text: 'one\ntwo',
      x: 10,
      y: 20,
      color: '#000000',
      fontSize: 16,
      isBold: false,
      isItalic: false,
      isUnderline: false
    }
    const after: TextElement = { ...before, text: '• one\n• two' }

    const command = createUpdateTextCommand('text-1', before, after, 'user-1')

    expect(command.before.text).toBe('one\ntwo')
    expect(command.after.text).toBe('• one\n• two')
  })

  it('recreates deleted elements when undoing delete-multiple', () => {
    const text: TextElement = {
      id: 'text-1',
      text: 'hello',
      x: 10,
      y: 20,
      color: '#000000',
      fontSize: 16,
      isBold: false,
      isItalic: false,
      isUnderline: false
    }

    const command = createDeleteMultipleCommand(
      [{ element: text, type: 'text' }],
      'user-1'
    )

    const inverse = getInverseCommand(command)

    expect(inverse.type).toBe('CREATE_MULTIPLE')
    if (inverse.type === 'CREATE_MULTIPLE') {
      expect(inverse.elements).toHaveLength(1)
      expect(inverse.elements[0]?.element).toEqual(text)
    }
  })

  it('creates multiple elements as one undoable command', () => {
    const shape: DiagramShape = {
      id: 'shape-1',
      kind: 'rectangle',
      x: 10,
      y: 20,
      width: 100,
      height: 60,
      rotation: 0,
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 2,
      strokeStyle: 'solid',
      opacity: 1,
      z: 1
    }

    const command = createCreateMultipleCommand(
      [{ element: shape, type: 'shape' }],
      'user-1'
    )
    shape.x = 99
    const inverse = getInverseCommand(command)

    expect(command.type).toBe('CREATE_MULTIPLE')
    expect(command.elements[0]?.element).toMatchObject({
      id: 'shape-1',
      x: 10
    })
    expect(inverse.type).toBe('DELETE_MULTIPLE')
    if (inverse.type === 'DELETE_MULTIPLE') {
      expect(inverse.elements[0]?.element.id).toBe('shape-1')
      expect(inverse.elements[0]?.type).toBe('shape')
    }
  })

  it('inverts create-shape into delete-element', () => {
    const shape: DiagramShape = {
      id: 'shape-1',
      kind: 'rectangle',
      x: 10,
      y: 20,
      width: 100,
      height: 60,
      rotation: 0,
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 2,
      strokeStyle: 'solid',
      opacity: 1,
      z: 1
    }

    const inverse = getInverseCommand(createCreateShapeCommand(shape, 'user-1'))

    expect(inverse.type).toBe('DELETE_ELEMENT')
    if (inverse.type === 'DELETE_ELEMENT') {
      expect(inverse.element.id).toBe('shape-1')
      expect(inverse.elementType).toBe('shape')
    }
  })

  it('swaps before and after for update-multiple undo', () => {
    const before: DiagramShape = {
      id: 'shape-1',
      kind: 'rectangle',
      x: 10,
      y: 20,
      width: 100,
      height: 60,
      rotation: 0,
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 2,
      strokeStyle: 'solid',
      opacity: 1,
      z: 1
    }
    const after: DiagramShape = { ...before, x: 40, rotation: 15 }

    const inverse = getInverseCommand(
      createUpdateMultipleCommand(
        [{ id: before.id, type: 'shape', before, after }],
        'user-1'
      )
    )

    expect(inverse.type).toBe('UPDATE_MULTIPLE')
    if (inverse.type === 'UPDATE_MULTIPLE') {
      expect(inverse.elements[0]?.before).toEqual(after)
      expect(inverse.elements[0]?.after).toEqual(before)
    }
  })
})
