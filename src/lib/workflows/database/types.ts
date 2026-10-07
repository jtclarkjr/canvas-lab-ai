import type { Edge, Node } from '@xyflow/svelte'
import type { DatabaseTable } from '#lib/workflows/database/schema.js'

export type DatabaseTableNodeData = {
  table: DatabaseTable
}

export type DatabaseRelationData = {
  relationId: string
  sourceColumnId: string
  targetColumnId: string
  name?: string
  onDelete?: string
}

export type DatabaseFlowNode = Node<DatabaseTableNodeData, 'databaseTable'>
export type DatabaseFlowEdge = Edge<DatabaseRelationData, 'smoothstep'>
