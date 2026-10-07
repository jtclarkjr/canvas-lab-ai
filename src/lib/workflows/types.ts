import type { Edge, Node } from '@xyflow/svelte'
import type { WorkflowStepType } from '#lib/workflows/schema.js'

export type WorkflowNodeData = {
  label: string
  stepType: WorkflowStepType
  description: string
  tool?: string
  config: Record<string, unknown>
  input: Record<string, unknown>
  actionKind: string
}

export type WorkflowFlowNode = Node<WorkflowNodeData, 'workflow'>
export type WorkflowFlowEdge = Edge<Record<string, never>, 'smoothstep'>
