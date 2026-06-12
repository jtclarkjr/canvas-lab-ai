export const CANVASES_DEPENDENCY = 'app:canvases'

export function sceneDocumentsDependency(canvasId: string) {
  return `app:scene-documents:${canvasId}`
}
