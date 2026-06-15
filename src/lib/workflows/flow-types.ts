import { defaultDatabaseDefinition } from '$lib/workflows/database/definition'
import { defaultWorkflowDefinition } from '$lib/workflows/definition'
import type {
  WorkflowDefinition,
  WorkflowFlowType
} from '$lib/workflows/schema'

export type WorkflowFlowTypeDefinition = {
  id: WorkflowFlowType
  label: string
  createLabel: string
  defaultTitle: string
  assistant: {
    proposalKind: string
    promptPlaceholder: string
    promptSubject: string
    system: string
    finalInstruction: string
  }
  createDefaultDefinition: (title: string) => WorkflowDefinition
}

export const workflowFlowTypeDefinition = {
  id: 'workflow',
  label: 'Workflow',
  createLabel: 'New workflow',
  defaultTitle: 'Workflow',
  assistant: {
    proposalKind: 'node-graph workflow',
    promptPlaceholder: 'Describe the workflow tree to build...',
    promptSubject: 'workflow',
    system:
      'You design node-graph workflows. Return a valid workflow proposal only. Nodes include labels, types, descriptions, dependencies, and positions, but do not claim execution is implemented.',
    finalInstruction:
      'Return a complete replacement workflow definition. Keep version as 1 and flowType as workflow. Provide configYaml matching the definition.'
  },
  createDefaultDefinition: defaultWorkflowDefinition
} satisfies WorkflowFlowTypeDefinition

export const databaseFlowTypeDefinition = {
  id: 'database',
  label: 'Database',
  createLabel: 'New database',
  defaultTitle: 'Database',
  assistant: {
    proposalKind: 'database schema',
    promptPlaceholder: 'Describe the database schema to build...',
    promptSubject: 'database schema',
    system:
      'You design Supabase-style database diagrams. Return a valid database schema proposal only. Include tables, columns, positions, and foreign-key relations, but do not claim migrations or live database changes are implemented.',
    finalInstruction:
      'Return a complete replacement database definition. Keep version as 1 and flowType as database. Provide configYaml matching the definition.'
  },
  createDefaultDefinition: defaultDatabaseDefinition
} satisfies WorkflowFlowTypeDefinition

export const workflowFlowTypes = {
  workflow: workflowFlowTypeDefinition,
  database: databaseFlowTypeDefinition
} satisfies Record<WorkflowFlowType, WorkflowFlowTypeDefinition>

export const workflowFlowTypeOptions = Object.values(workflowFlowTypes)

export function getWorkflowFlowTypeDefinition(
  flowType: WorkflowFlowType
): WorkflowFlowTypeDefinition {
  return workflowFlowTypes[flowType]
}

export function createDefaultDefinitionForFlowType(
  flowType: WorkflowFlowType,
  title?: string
): WorkflowDefinition {
  const definition = getWorkflowFlowTypeDefinition(flowType)
  return definition.createDefaultDefinition(title ?? definition.defaultTitle)
}
