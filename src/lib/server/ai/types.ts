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

export type CanvasAssistantInput = {
  resolved: ResolvedModel
  webSearch: boolean
  messages: UIMessage[]
  // Saved documents from all scenes of the canvas, readable on demand.
  contextDocuments: ContextDocumentRef[]
  loadContextDocument: LoadContextDocument
}
