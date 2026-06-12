export type WorkspaceMode = 'editor' | 'scenes'

export type SceneTypeId = 'document'

export type SceneTypeDefinition = {
  id: SceneTypeId
  label: string
  description: string
  defaultTitle: string
  defaultSize: { width: number; height: number }
}

export type DocumentCategoryId = string

export type DocumentPreset = {
  id: string
  label: string
  prompt: string
}

export type DocumentCategory = {
  id: DocumentCategoryId
  label: string
  description: string
  docType: string
  presets: DocumentPreset[]
}

export type ModelProvider = 'anthropic' | 'openai'

export type ModelOption = {
  id: string
  label: string
  provider: ModelProvider
}

export type SceneActivityKind = 'generating' | 'drawing' | 'idle'

export type SceneActivity = {
  sceneId: string
  userId: string
  kind: SceneActivityKind
  textDelta?: string
}
