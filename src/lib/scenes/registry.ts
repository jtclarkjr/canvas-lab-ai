import type { SceneTypeDefinition, SceneTypeId } from '$lib/scenes/types'

// Scene-type registry. Adding a scene type is additive: append an entry
// here and register its view component in SceneDialog's component map.
// (Notes is not a scene type — it's a view inside the document scene.)
export const sceneTypes: SceneTypeDefinition[] = [
  {
    id: 'document',
    label: 'Document',
    description: 'Draft docs with AI — chat, edit, take notes, download.',
    defaultTitle: 'New document',
    defaultSize: { width: 320, height: 200 }
  }
]

export function getSceneType(id: string): SceneTypeDefinition | null {
  return sceneTypes.find((type) => type.id === id) ?? null
}

export function isSceneTypeId(id: string): id is SceneTypeId {
  return sceneTypes.some((type) => type.id === id)
}
