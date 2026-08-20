import {
  defaultWorkflowDefinition,
  workflowDefinitionToYaml
} from '$lib/workflows/definition'
import { createDefaultDefinitionForFlowType } from '$lib/workflows/flow-types'
import type { Workflow } from '$lib/workflows/schema'

const createdAt = '2026-08-19T10:00:00.000Z'

function workflowFromDefinition(
  id: string,
  title: string,
  definition: Workflow['definition']
): Workflow {
  return {
    id,
    canvasId: 'canvas-workflow-story',
    title,
    x: 36,
    y: 32,
    width: 760,
    height: 480,
    rotation: 0,
    definition,
    configYaml: workflowDefinitionToYaml(definition),
    notes: 'Review ownership and failure paths before launch.',
    settings: {
      context: {
        documentIds: [],
        sceneIds: [],
        includeLinkedScenes: true
      }
    },
    createdBy: 'user-james',
    updatedBy: 'user-james',
    createdAt,
    updatedAt: '2026-08-19T10:05:00.000Z'
  }
}

export const workflowFixture = workflowFromDefinition(
  'workflow-story',
  'Launch workflow',
  defaultWorkflowDefinition('Launch workflow')
)

export const databaseWorkflowFixture = workflowFromDefinition(
  'database-workflow-story',
  'Product database',
  createDefaultDefinitionForFlowType('database', 'Product database')
)
