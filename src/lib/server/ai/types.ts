import type { LanguageModel, Tool, UIMessage } from 'ai'

export type AiProviderKeys = {
  openaiApiKey?: string
  anthropicApiKey?: string
}

export type ResolvedModel = {
  model: LanguageModel
  // Provider-native web search tool factory; null when the provider has none.
  createWebSearchTool: (() => Tool) | null
}

export type AiRegistry = {
  resolve: (modelId: string) => ResolvedModel
  listIds: () => string[]
}

export type ActiveDocument = {
  title: string
  markdown: string
}

export type ContextDocumentRef = {
  id: string
  title: string
  sceneId?: string
  sceneTitle?: string
  source?: 'manual' | 'linked-scene'
}

export type LoadContextDocument = (
  documentId: string
) => Promise<ActiveDocument | null>

export type DocumentChatInput = {
  resolved: ResolvedModel
  category: string
  webSearch: boolean
  messages: UIMessage[]
  activeDocument: ActiveDocument | null
  contextDocuments: ContextDocumentRef[]
  loadContextDocument: LoadContextDocument
}

export type CanvasAssistantInput = Omit<
  DocumentChatInput,
  'category' | 'activeDocument'
>
