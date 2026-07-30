import type { WorkspaceSurfaceInteractionsInput } from './types'
import type { SurfaceCtx } from './context/types'

export function createSurfaceCtx(
  config: WorkspaceSurfaceInteractionsInput
): SurfaceCtx {
  return {
    ...config,
    getShapesSafe: () => config.getShapes?.() ?? [],
    getConnectorsSafe: () => config.getConnectors?.() ?? [],
    getScenesSafe: () => config.getScenes?.() ?? [],
    setShapesSafe: (next) => {
      config.setShapes?.(next)
    },
    setConnectorsSafe: (next) => {
      config.setConnectors?.(next)
    },
    setScenesSafe: (next) => {
      config.setScenes?.(next)
    },
    activeInteraction: null,
    pendingDrag: null,
    originalElementPositions: {
      paths: new Map(),
      texts: new Map(),
      shapes: new Map(),
      connectors: new Map(),
      scenes: new Map()
    },
    lastClickTime: 0,
    lastClickPos: null,
    isDraggingSelection: false,
    dragStartPos: null
  }
}
