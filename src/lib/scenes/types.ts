export type WorkspaceMode = 'editor' | 'scenes' | 'workflows'

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
  usageTier: 'limited' | 'unlimited'
}

export type SceneActivityKind = 'generating' | 'drawing' | 'idle'

export type SceneActivity = {
  sceneId: string
  userId: string
  userName?: string
  kind: SceneActivityKind
  textDelta?: string
}

import type { UIMessage } from 'ai'

// AI chat message parts
export type ChatPartLike = { type: string } & Record<string, unknown>

export type DisplayMessage = UIMessage

export type DraftToolPart = {
  state: string
  title: string
  content: string
}

// Document autosave
export type DocumentSaveSnapshot = {
  title: string
  markdown: string
}
