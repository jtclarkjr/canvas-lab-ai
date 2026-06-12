export { AiModelError, createAiRegistry } from './registry'
export { streamDocumentChat } from './agents/document-agent'
export { streamCanvasAssistant } from './agents/canvas-assistant-agent'
export type {
  ActiveDocument,
  AiProviderKeys,
  AiRegistry,
  CanvasAssistantInput,
  ContextDocumentRef,
  DocumentChatInput,
  LoadContextDocument,
  ResolvedModel
} from './types'
