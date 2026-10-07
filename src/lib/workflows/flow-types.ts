import databaseFinalInstructionMarkdown from '#lib/ai/prompts/markdown/workflow/database-final-instruction.md?raw'
import databaseSystemPromptMarkdown from '#lib/ai/prompts/markdown/workflow/database-system.md?raw'
import workflowFinalInstructionMarkdown from '#lib/ai/prompts/markdown/workflow/workflow-final-instruction.md?raw'
import workflowSystemPromptMarkdown from '#lib/ai/prompts/markdown/workflow/workflow-system.md?raw'
import { defaultDatabaseDefinition } from '#lib/workflows/database/definition.js'
import { defaultWorkflowDefinition } from '#lib/workflows/definition.js'
import type {
  WorkflowDefinition,
  WorkflowFlowType
} from '#lib/workflows/schema.js'

const workflowSystemPrompt = workflowSystemPromptMarkdown.trim()
const workflowFinalInstruction = workflowFinalInstructionMarkdown.trim()
const databaseSystemPrompt = databaseSystemPromptMarkdown.trim()
const databaseFinalInstruction = databaseFinalInstructionMarkdown.trim()

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
    system: workflowSystemPrompt,
    finalInstruction: workflowFinalInstruction
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
    system: databaseSystemPrompt,
    finalInstruction: databaseFinalInstruction
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
