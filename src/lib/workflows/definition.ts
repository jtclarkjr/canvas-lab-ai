import type { Edge, Node } from '@xyflow/svelte'
import { parse, stringify } from 'yaml'
import {
  workflowDefinitionSchema,
  type WorkflowDefinition,
  type WorkflowStep,
  type WorkflowStepType
} from '$lib/workflows/schema'

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

const DEFAULT_NODE_GAP = 220

export function defaultWorkflowDefinition(
  name = 'Workflow'
): WorkflowDefinition {
  return normalizeWorkflowDefinition({
    version: 1,
    name,
    description: '',
    steps: [
      {
        id: 'input',
        title: 'Input',
        type: 'input',
        description: 'Workflow input or starting context.',
        position: { x: 40, y: 120 }
      },
      {
        id: 'task',
        title: 'Task',
        type: 'task',
        description: 'Add workflow logic here later.',
        needs: ['input'],
        position: { x: 320, y: 120 }
      },
      {
        id: 'output',
        title: 'Output',
        type: 'output',
        description: 'Result, artifact, or handoff.',
        needs: ['task'],
        position: { x: 600, y: 120 }
      }
    ]
  })
}

export function normalizeWorkflowDefinition(
  input: unknown
): WorkflowDefinition {
  return workflowDefinitionSchema.parse(input)
}

export function workflowDefinitionToYaml(
  definition: WorkflowDefinition
): string {
  const normalized = normalizeWorkflowDefinition(definition)
  return stringify(normalized, {
    lineWidth: 0,
    singleQuote: false
  }).trimEnd()
}

export function workflowDefinitionFromYaml(
  configYaml: string
): WorkflowDefinition {
  const parsed = configYaml.trim() ? parse(configYaml) : {}
  return normalizeWorkflowDefinition(parsed)
}

export function workflowDefinitionToFlow(definition: WorkflowDefinition): {
  nodes: WorkflowFlowNode[]
  edges: WorkflowFlowEdge[]
} {
  const normalized = normalizeWorkflowDefinition(definition)
  const nodes = normalized.steps.map((step, index) => ({
    id: step.id,
    type: 'workflow' as const,
    position: step.position ?? { x: index * DEFAULT_NODE_GAP, y: 80 },
    data: {
      label: step.title,
      stepType: step.type,
      description: step.description,
      tool: step.tool,
      config: step.config,
      input: step.input,
      actionKind: step.action.kind
    }
  }))
  const edges = normalized.steps.flatMap((step) =>
    step.needs.map((sourceId) => ({
      id: `${sourceId}->${step.id}`,
      source: sourceId,
      target: step.id,
      type: 'smoothstep' as const,
      markerEnd: {
        type: 'arrowclosed' as const
      },
      data: {}
    }))
  )

  return { nodes, edges }
}

export function workflowDefinitionFromFlow(
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
  previous: WorkflowDefinition
): WorkflowDefinition {
  const previousById = new Map(previous.steps.map((step) => [step.id, step]))
  const nodeIds = new Set(nodes.map((node) => node.id))
  const dependenciesByTarget = new Map<string, string[]>()

  for (const edge of edges) {
    if (!edge.source || !edge.target) continue
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue
    const existing = dependenciesByTarget.get(edge.target) ?? []
    if (!existing.includes(edge.source)) {
      dependenciesByTarget.set(edge.target, [...existing, edge.source])
    }
  }

  return normalizeWorkflowDefinition({
    ...previous,
    steps: nodes.map((node, index) => {
      const previousStep = previousById.get(node.id)
      return {
        id: node.id,
        title: String(node.data.label || previousStep?.title || node.id),
        type: node.data.stepType ?? previousStep?.type ?? 'task',
        description: node.data.description ?? previousStep?.description ?? '',
        tool: node.data.tool ?? previousStep?.tool,
        needs: dependenciesByTarget.get(node.id) ?? [],
        input: node.data.input ?? previousStep?.input ?? {},
        config: node.data.config ?? previousStep?.config ?? {},
        action: previousStep?.action ?? { kind: 'none', config: {} },
        position: node.position ??
          previousStep?.position ?? { x: index * 220, y: 80 }
      } satisfies WorkflowStep
    })
  })
}

export function createWorkflowStep(
  existing: WorkflowDefinition,
  type: WorkflowStepType
): WorkflowStep {
  const baseId = type
  const usedIds = new Set(existing.steps.map((step) => step.id))
  let suffix = existing.steps.length + 1
  let id = `${baseId}_${suffix}`
  while (usedIds.has(id)) {
    suffix += 1
    id = `${baseId}_${suffix}`
  }

  const lastStep = existing.steps.at(-1)
  return {
    id,
    title: titleForStepType(type),
    type,
    description: '',
    tool: undefined,
    needs: lastStep ? [lastStep.id] : [],
    input: {},
    config: {},
    action: { kind: 'none', config: {} },
    position: {
      x: (lastStep?.position.x ?? 40) + DEFAULT_NODE_GAP,
      y: lastStep?.position.y ?? 120
    }
  }
}

function titleForStepType(type: WorkflowStepType) {
  switch (type) {
    case 'input':
      return 'Input'
    case 'decision':
      return 'Decision'
    case 'output':
      return 'Output'
    case 'note':
      return 'Note'
    case 'task':
    default:
      return 'Task'
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('workflow definitions', () => {
    it('round-trips default workflows through YAML', () => {
      const definition = defaultWorkflowDefinition('Contract review')
      const yaml = workflowDefinitionToYaml(definition)

      expect(workflowDefinitionFromYaml(yaml)).toEqual(definition)
    })

    it('converts flow edges back to step dependencies', () => {
      const definition = defaultWorkflowDefinition()
      const flow = workflowDefinitionToFlow(definition)
      const next = workflowDefinitionFromFlow(
        flow.nodes,
        [
          ...flow.edges,
          {
            id: 'input->output',
            source: 'input',
            target: 'output',
            type: 'smoothstep',
            data: {}
          }
        ],
        definition
      )

      expect(next.steps.find((step) => step.id === 'output')?.needs).toContain(
        'input'
      )
    })
  })
}
