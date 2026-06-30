import { describe, expect, it } from 'vite-plus/test'
import type { Command } from '$lib/canvas/commands'
import type { DrawFormatting, Path, Point } from '$lib/canvas/types'
import { createWorkspaceFormattingStore } from '$lib/stores/workspace/formatting.svelte'
import type { SurfaceCtx } from '$lib/stores/workspace/surface-interactions/context'
import {
  setDrawColor,
  setDrawWidth,
  setHighlighterOpacity,
  toggleHighlighter
} from '$lib/stores/workspace/surface-interactions/formatting'
import type { UpsertElementInput } from '$lib/workspace/schema'

function makePath(overrides: Partial<Path> = {}): Path {
  return {
    id: 'path-1',
    points: [
      { x: 1, y: 2 },
      { x: 3, y: 4 }
    ],
    color: '#000000',
    width: 2,
    opacity: 1,
    z: 10,
    ...overrides
  }
}

function clonePoints(points: Point[]) {
  return points.map((point) => ({ ...point }))
}

function createFakeFormattingStore(
  initial: Partial<DrawFormatting> = {}
): SurfaceCtx['formattingStore'] {
  let drawFormatting: DrawFormatting = {
    width: 2,
    color: '#000000',
    style: 'freeform',
    isHighlighter: false,
    highlighterOpacity: 0.4,
    ...initial
  }

  return {
    setDrawWidth(width: number) {
      drawFormatting = { ...drawFormatting, width }
    },
    setDrawColor(color: string) {
      drawFormatting = { ...drawFormatting, color }
    },
    setDrawStyle(style: DrawFormatting['style']) {
      drawFormatting = { ...drawFormatting, style }
    },
    toggleHighlighter() {
      drawFormatting = {
        ...drawFormatting,
        isHighlighter: !drawFormatting.isHighlighter
      }
    },
    setHighlighterOpacity(highlighterOpacity: number) {
      drawFormatting = { ...drawFormatting, highlighterOpacity }
    },
    get drawFormatting() {
      return drawFormatting
    }
  } as SurfaceCtx['formattingStore']
}

function createSurfaceHarness({
  initialPaths,
  selectedIds,
  modifiableIds = selectedIds,
  formatting = {}
}: {
  initialPaths: Path[]
  selectedIds: string[]
  modifiableIds?: string[]
  formatting?: Partial<DrawFormatting>
}) {
  let paths = initialPaths.map((path) => ({
    ...path,
    points: clonePoints(path.points)
  }))
  const commands: Command[] = []
  const persisted: UpsertElementInput[] = []
  const formattingStore = createFakeFormattingStore(formatting)
  const modifiable = new Set(modifiableIds)

  const ctx = {
    getActiveCanvasId: () => 'canvas-1',
    getUserId: () => 'user-1',
    getSelectedElementIds: () => new Set(selectedIds),
    canModifyElement: (id: string) => modifiable.has(id),
    setPaths(next: Path[] | ((previous: Path[]) => Path[])) {
      paths = typeof next === 'function' ? next(paths) : next
    },
    addHistoryCommand(command: Command) {
      commands.push(command)
    },
    upsertElement: {
      mutate(variables: UpsertElementInput) {
        persisted.push(variables)
      }
    },
    formattingStore
  } as SurfaceCtx

  return {
    ctx,
    commands,
    persisted,
    formattingStore,
    get paths() {
      return paths
    }
  }
}

describe('workspace draw formatting', () => {
  it('updates only selected editable paths and persists their draw data', () => {
    const selected = makePath({ id: 'selected', z: 1 })
    const locked = makePath({ id: 'locked', z: 2 })
    const unselected = makePath({ id: 'unselected', z: 3 })
    const harness = createSurfaceHarness({
      initialPaths: [selected, locked, unselected],
      selectedIds: ['selected', 'locked'],
      modifiableIds: ['selected']
    })

    setDrawColor(harness.ctx, '#2563eb')
    setDrawWidth(harness.ctx, 8)

    expect(harness.paths).toEqual([
      { ...selected, color: '#2563eb', width: 8 },
      locked,
      unselected
    ])
    expect(harness.commands).toHaveLength(2)
    expect(harness.commands[0]?.type).toBe('UPDATE_MULTIPLE')
    if (harness.commands[0]?.type === 'UPDATE_MULTIPLE') {
      expect(harness.commands[0].elements).toEqual([
        {
          id: 'selected',
          type: 'path',
          before: selected,
          after: { ...selected, color: '#2563eb' }
        }
      ])
    }
    expect(harness.persisted[1]).toMatchObject({
      id: 'selected',
      canvasId: 'canvas-1',
      type: 'path',
      data: {
        points: selected.points,
        color: '#2563eb',
        width: 8,
        opacity: 1
      },
      x: 0,
      y: 0,
      z: 1
    })
  })

  it('maps highlighter controls to selected path opacity', () => {
    const path = makePath()
    const harness = createSurfaceHarness({
      initialPaths: [path],
      selectedIds: [path.id],
      formatting: {
        isHighlighter: false,
        highlighterOpacity: 0.45
      }
    })

    toggleHighlighter(harness.ctx)
    expect(harness.formattingStore.drawFormatting.isHighlighter).toBe(true)
    expect(harness.paths[0]?.opacity).toBe(0.45)

    setHighlighterOpacity(harness.ctx, 0.7)
    expect(harness.formattingStore.drawFormatting.highlighterOpacity).toBe(0.7)
    expect(harness.paths[0]?.opacity).toBe(0.7)

    toggleHighlighter(harness.ctx)
    expect(harness.formattingStore.drawFormatting.isHighlighter).toBe(false)
    expect(harness.paths[0]?.opacity).toBe(1)
    expect(harness.commands).toHaveLength(3)
    expect(harness.persisted.map((entry) => entry.data?.opacity)).toEqual([
      0.45, 0.7, 1
    ])
  })

  it('does not update selected path opacity when highlighter opacity changes while inactive', () => {
    const path = makePath()
    const harness = createSurfaceHarness({
      initialPaths: [path],
      selectedIds: [path.id],
      formatting: {
        isHighlighter: false,
        highlighterOpacity: 0.4
      }
    })

    setHighlighterOpacity(harness.ctx, 0.8)

    expect(harness.formattingStore.drawFormatting.highlighterOpacity).toBe(0.8)
    expect(harness.paths[0]?.opacity).toBe(1)
    expect(harness.commands).toHaveLength(0)
    expect(harness.persisted).toHaveLength(0)
  })

  it('syncs selected path opacity into draw highlighter state', () => {
    const store = createWorkspaceFormattingStore()
    store.setHighlighterOpacity(0.75)

    store.syncDrawFormattingFromPath(
      makePath({ width: 6, color: '#dc2626', opacity: 1 })
    )
    expect(store.drawFormatting).toMatchObject({
      width: 6,
      color: '#dc2626',
      isHighlighter: false,
      highlighterOpacity: 0.75
    })

    store.syncDrawFormattingFromPath(
      makePath({ width: 10, color: '#16a34a', opacity: 0.35 })
    )
    expect(store.drawFormatting).toMatchObject({
      width: 10,
      color: '#16a34a',
      isHighlighter: true,
      highlighterOpacity: 0.35
    })
  })
})
