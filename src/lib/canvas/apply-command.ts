import type { Path, TextElement } from '$lib/canvas/types'
import type { ApplyCommandOptions, Command } from '$lib/canvas/commands'
import { textElementToData } from '$lib/canvas/drawing-utils'

const isPath = (element: Path | TextElement): element is Path => 'points' in element
const isTextElement = (element: Path | TextElement): element is TextElement =>
  'text' in element

export function createApplyCommand({
  canvasId,
  paths,
  textElements,
  setPaths,
  setTextElements,
  upsertElement,
  deleteElement
}: ApplyCommandOptions) {
  return (command: Command) => {
    switch (command.type) {
      case 'CREATE_PATH': {
        const path = command.element
        setPaths((prev) => [...prev, path])
        upsertElement.mutate(
          {
            id: path.id,
            canvasId,
            type: 'path',
            data: {
              points: path.points,
              color: path.color,
              width: path.width
            },
            x: 0,
            y: 0,
            z: Date.now()
          },
          {
            onError: () => {
              setPaths((prev) => prev.filter((entry) => entry.id !== path.id))
            }
          }
        )
        break
      }
      case 'CREATE_TEXT': {
        const text = command.element
        setTextElements((prev) => [...prev, text])
        upsertElement.mutate(
          {
            id: text.id,
            canvasId,
            type: 'text',
            data: textElementToData(text),
            x: text.x,
            y: text.y,
            z: Date.now()
          },
          {
            onError: () => {
              setTextElements((prev) =>
                prev.filter((entry) => entry.id !== text.id)
              )
            }
          }
        )
        break
      }
      case 'CREATE_MULTIPLE': {
        for (const { element, type } of command.elements) {
          if (type === 'path' && 'points' in element) {
            setPaths((prev) => [...prev, element])
            upsertElement.mutate({
              id: element.id,
              canvasId,
              type: 'path',
              data: {
                points: element.points,
                color: element.color,
                width: element.width
              },
              x: 0,
              y: 0,
              z: Date.now()
            })
          } else if (type === 'text' && isTextElement(element)) {
            setTextElements((prev) => [...prev, element])
            upsertElement.mutate({
              id: element.id,
              canvasId,
              type: 'text',
              data: textElementToData(element),
              x: element.x,
              y: element.y,
              z: Date.now()
            })
          }
        }
        break
      }
      case 'DELETE_ELEMENT': {
        const elementId = command.element.id
        if (command.elementType === 'path') {
          setPaths((prev) => prev.filter((entry) => entry.id !== elementId))
        } else {
          setTextElements((prev) =>
            prev.filter((entry) => entry.id !== elementId)
          )
        }

        deleteElement.mutate(
          { id: elementId },
          {
            onError: () => {
              if (isPath(command.element)) {
                const path = command.element
                setPaths((prev) => [...prev, path])
              } else if (isTextElement(command.element)) {
                const text = command.element
                setTextElements((prev) => [...prev, text])
              }
            }
          }
        )
        break
      }
      case 'DELETE_MULTIPLE': {
        for (const { element, type } of command.elements) {
          if (type === 'path') {
            setPaths((prev) => prev.filter((entry) => entry.id !== element.id))
          } else {
            setTextElements((prev) =>
              prev.filter((entry) => entry.id !== element.id)
            )
          }
          deleteElement.mutate({ id: element.id })
        }
        break
      }
      case 'UPDATE_TEXT': {
        const text = command.after
        setTextElements((prev) =>
          prev.map((entry) =>
            entry.id === command.elementId ? text : entry
          )
        )
        upsertElement.mutate({
          id: text.id,
          canvasId,
          type: 'text',
          data: textElementToData(text),
          x: text.x,
          y: text.y,
          z: Date.now()
        })
        break
      }
      case 'MOVE_ELEMENT': {
        if (command.elementType === 'path' && command.after.points) {
          setPaths((prev) =>
            prev.map((entry) =>
              entry.id === command.elementId
                ? { ...entry, points: command.after.points ?? entry.points }
                : entry
            )
          )
          const path = paths.find((entry) => entry.id === command.elementId)
          if (path && command.after.points) {
            upsertElement.mutate({
              id: path.id,
              canvasId,
              type: 'path',
              data: {
                points: command.after.points,
                color: path.color,
                width: path.width
              },
              x: 0,
              y: 0,
              z: Date.now()
            })
          }
        } else if (
          command.elementType === 'text' &&
          command.after.x !== undefined &&
          command.after.y !== undefined
        ) {
          setTextElements((prev) =>
            prev.map((entry) =>
              entry.id === command.elementId
                ? {
                    ...entry,
                    x: command.after.x ?? entry.x,
                    y: command.after.y ?? entry.y
                  }
                : entry
            )
          )
          const text = textElements.find((entry) => entry.id === command.elementId)
          if (text) {
            upsertElement.mutate({
              id: text.id,
              canvasId,
              type: 'text',
              data: textElementToData(text),
              x: command.after.x,
              y: command.after.y,
              z: Date.now()
            })
          }
        }
        break
      }
      case 'MOVE_MULTIPLE': {
        for (const element of command.elements) {
          if (element.type === 'path' && element.after.points) {
            setPaths((prev) =>
              prev.map((entry) =>
                entry.id === element.id
                  ? { ...entry, points: element.after.points ?? entry.points }
                  : entry
              )
            )
            const path = paths.find((entry) => entry.id === element.id)
            if (path) {
              upsertElement.mutate({
                id: path.id,
                canvasId,
                type: 'path',
                data: {
                  points: element.after.points,
                  color: path.color,
                  width: path.width
                },
                x: 0,
                y: 0,
                z: Date.now()
              })
            }
          } else if (
            element.type === 'text' &&
            element.after.x !== undefined &&
            element.after.y !== undefined
          ) {
            setTextElements((prev) =>
              prev.map((entry) =>
                entry.id === element.id
                  ? {
                      ...entry,
                      x: element.after.x ?? entry.x,
                      y: element.after.y ?? entry.y
                    }
                  : entry
              )
            )
            const text = textElements.find((entry) => entry.id === element.id)
            if (text) {
              upsertElement.mutate({
                id: text.id,
                canvasId,
                type: 'text',
                data: textElementToData(text),
                x: element.after.x,
                y: element.after.y,
                z: Date.now()
              })
            }
          }
        }
        break
      }
    }
  }
}
