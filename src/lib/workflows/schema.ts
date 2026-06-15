import { z } from 'zod'
import { databaseFlowDefinitionSchema } from '$lib/workflows/database/schema'

export {
  databaseColumnSchema,
  databaseFlowDefinitionSchema,
  databaseRelationSchema,
  databaseTableSchema
} from '$lib/workflows/database/schema'
export type {
  DatabaseColumn,
  DatabaseFlowDefinition,
  DatabaseRelation,
  DatabaseTable
} from '$lib/workflows/database/schema'

export const workflowFlowTypeSchema = z.enum(['workflow', 'database'])

export const workflowStepTypeSchema = z.enum([
  'input',
  'task',
  'decision',
  'output',
  'note'
])

export const workflowPositionSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0)
})

export const workflowActionSchema = z.object({
  kind: z.string().min(1).default('none'),
  name: z.string().trim().max(120).optional(),
  config: z.record(z.string(), z.unknown()).default({})
})

export const workflowStepSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1).max(120),
  type: workflowStepTypeSchema.default('task'),
  description: z.string().default(''),
  tool: z.string().trim().max(120).optional(),
  needs: z.array(z.string().trim().min(1)).default([]),
  input: z.record(z.string(), z.unknown()).default({}),
  config: z.record(z.string(), z.unknown()).default({}),
  action: workflowActionSchema.default({
    kind: 'none',
    config: {}
  }),
  position: workflowPositionSchema.default({ x: 0, y: 0 })
})

export const workflowGraphDefinitionSchema = z
  .object({
    version: z.literal(1).default(1),
    flowType: z.literal('workflow').default('workflow'),
    name: z.string().trim().min(1).max(120).default('Workflow'),
    description: z.string().default(''),
    steps: z.array(workflowStepSchema).default([])
  })
  .superRefine((definition, context) => {
    const ids = new Set<string>()
    for (const step of definition.steps) {
      if (ids.has(step.id)) {
        context.addIssue({
          code: 'custom',
          path: ['steps'],
          message: `Duplicate workflow step id: ${step.id}`
        })
      }
      ids.add(step.id)
    }

    for (const step of definition.steps) {
      for (const dependencyId of step.needs) {
        if (!ids.has(dependencyId)) {
          context.addIssue({
            code: 'custom',
            path: ['steps', step.id, 'needs'],
            message: `Step ${step.id} depends on missing step ${dependencyId}.`
          })
        }
      }
    }
  })

const workflowAssistantPositionSchema = z.object({
  x: z.number(),
  y: z.number()
})

const workflowAssistantStepSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1).max(120),
  type: workflowStepTypeSchema,
  description: z.string(),
  needs: z.array(z.string().trim().min(1)),
  position: workflowAssistantPositionSchema
})

const workflowAssistantGraphDefinitionSchema = z.object({
  version: z.literal(1),
  flowType: z.literal('workflow'),
  name: z.string().trim().min(1).max(120),
  description: z.string(),
  steps: z.array(workflowAssistantStepSchema)
})

const databaseAssistantColumnSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  dataType: z.string().trim().min(1).max(120),
  nullable: z.boolean(),
  primaryKey: z.boolean(),
  unique: z.boolean(),
  identity: z.boolean()
})

const databaseAssistantTableSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  schema: z.string().trim().min(1).max(120),
  description: z.string(),
  position: workflowAssistantPositionSchema,
  columns: z.array(databaseAssistantColumnSchema)
})

const databaseAssistantRelationSchema = z.object({
  id: z.string().trim().min(1),
  sourceTableId: z.string().trim().min(1),
  sourceColumnId: z.string().trim().min(1),
  targetTableId: z.string().trim().min(1),
  targetColumnId: z.string().trim().min(1)
})

const databaseAssistantFlowDefinitionSchema = z.object({
  version: z.literal(1),
  flowType: z.literal('database'),
  name: z.string().trim().min(1).max(120),
  description: z.string(),
  tables: z.array(databaseAssistantTableSchema),
  relations: z.array(databaseAssistantRelationSchema)
})

export const workflowDefinitionSchema = z.preprocess(
  (input) => {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      const record = input as Record<string, unknown>
      if (!record.flowType) {
        return { ...record, flowType: 'workflow' }
      }
    }
    return input
  },
  z.discriminatedUnion('flowType', [
    workflowGraphDefinitionSchema,
    databaseFlowDefinitionSchema
  ])
)

export const workflowContextSettingsSchema = z.object({
  documentIds: z.array(z.string()).max(20).default([]),
  sceneIds: z.array(z.string()).max(20).default([]),
  includeLinkedScenes: z.boolean().default(true)
})

export const workflowSettingsSchema = z.object({
  context: workflowContextSettingsSchema.default({
    documentIds: [],
    sceneIds: [],
    includeLinkedScenes: true
  })
})

export const workflowRowSchema = z.object({
  id: z.string(),
  canvas_id: z.string(),
  title: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  definition: workflowDefinitionSchema,
  config_yaml: z.string(),
  notes: z.string(),
  settings: workflowSettingsSchema,
  created_by: z.string().nullable(),
  updated_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
})

export const workflowSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  title: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  definition: workflowDefinitionSchema,
  configYaml: z.string(),
  notes: z.string(),
  settings: workflowSettingsSchema,
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const workflowTitleSchema = z
  .string()
  .trim()
  .min(1, 'Workflow titles cannot be empty.')
  .max(120, 'Keep workflow titles under 120 characters.')

export const createWorkflowInputSchema = z.object({
  title: workflowTitleSchema.optional(),
  flowType: workflowFlowTypeSchema.optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().min(360).max(4000).optional(),
  height: z.number().min(280).max(4000).optional(),
  rotation: z.number().optional(),
  definition: workflowDefinitionSchema.optional(),
  configYaml: z.string().optional(),
  notes: z.string().optional(),
  settings: workflowSettingsSchema.optional()
})

export const updateWorkflowInputSchema = z
  .object({
    title: workflowTitleSchema,
    x: z.number(),
    y: z.number(),
    width: z.number().min(360).max(4000),
    height: z.number().min(280).max(4000),
    rotation: z.number(),
    definition: workflowDefinitionSchema,
    configYaml: z.string(),
    notes: z.string(),
    settings: workflowSettingsSchema
  })
  .partial()

export const workflowVersionRowSchema = z.object({
  id: z.string(),
  workflow_id: z.string(),
  canvas_id: z.string(),
  title: z.string(),
  definition: workflowDefinitionSchema,
  config_yaml: z.string(),
  notes: z.string(),
  created_by: z.string().nullable(),
  created_at: z.string()
})

export const workflowVersionSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  canvasId: z.string(),
  title: z.string(),
  definition: workflowDefinitionSchema,
  configYaml: z.string(),
  notes: z.string(),
  createdBy: z.string().nullable(),
  createdAt: z.string()
})

export const createWorkflowVersionInputSchema = z.object({
  title: z.string().trim().max(120).optional()
})

export const workflowResponseSchema = z.object({ item: workflowSchema })
export const listWorkflowsResponseSchema = z.object({
  items: z.array(workflowSchema)
})
export const workflowVersionResponseSchema = z.object({
  item: workflowVersionSchema
})
export const listWorkflowVersionsResponseSchema = z.object({
  items: z.array(workflowVersionSchema)
})

function createWorkflowProposalSchema<DefinitionSchema extends z.ZodType>(
  definitionSchema: DefinitionSchema
) {
  return z.object({
    summary: z.string().min(1),
    definition: definitionSchema,
    configYaml: z.string()
  })
}

export const workflowGraphProposalSchema = createWorkflowProposalSchema(
  workflowAssistantGraphDefinitionSchema
)

export const databaseWorkflowProposalSchema = createWorkflowProposalSchema(
  databaseAssistantFlowDefinitionSchema
)

export const workflowProposalSchema = z.object({
  summary: z.string().min(1),
  definition: workflowDefinitionSchema,
  configYaml: z.string()
})

const workflowProposalSchemas = {
  workflow: workflowGraphProposalSchema,
  database: databaseWorkflowProposalSchema
} satisfies Record<z.infer<typeof workflowFlowTypeSchema>, z.ZodType>

export function getWorkflowProposalSchema(
  flowType: z.infer<typeof workflowFlowTypeSchema>
) {
  return workflowProposalSchemas[flowType]
}

export const workflowAssistantRequestSchema = z.object({
  canvasId: z.string().min(1),
  workflowId: z.string().min(1),
  modelId: z.string().min(1),
  prompt: z.string().trim().min(1).max(4000),
  workflow: workflowSchema,
  context: workflowContextSettingsSchema
})

export const workflowAssistantResponseSchema = z.object({
  message: z.string(),
  proposal: workflowProposalSchema.nullable()
})

export type WorkflowFlowType = z.infer<typeof workflowFlowTypeSchema>
export type WorkflowStepType = z.infer<typeof workflowStepTypeSchema>
export type WorkflowStep = z.infer<typeof workflowStepSchema>
export type WorkflowGraphDefinition = z.infer<
  typeof workflowGraphDefinitionSchema
>
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>
export type WorkflowContextSettings = z.infer<
  typeof workflowContextSettingsSchema
>
export type WorkflowSettings = z.infer<typeof workflowSettingsSchema>
export type WorkflowRow = z.infer<typeof workflowRowSchema>
export type Workflow = z.infer<typeof workflowSchema>
export type CreateWorkflowInput = z.infer<typeof createWorkflowInputSchema>
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowInputSchema>
export type WorkflowVersionRow = z.infer<typeof workflowVersionRowSchema>
export type WorkflowVersion = z.infer<typeof workflowVersionSchema>
export type CreateWorkflowVersionInput = z.infer<
  typeof createWorkflowVersionInputSchema
>
export type WorkflowResponse = z.infer<typeof workflowResponseSchema>
export type ListWorkflowsResponse = z.infer<typeof listWorkflowsResponseSchema>
export type WorkflowVersionResponse = z.infer<
  typeof workflowVersionResponseSchema
>
export type ListWorkflowVersionsResponse = z.infer<
  typeof listWorkflowVersionsResponseSchema
>
export type WorkflowProposal = z.infer<typeof workflowProposalSchema>
export type WorkflowAssistantRequest = z.infer<
  typeof workflowAssistantRequestSchema
>
export type WorkflowAssistantResponse = z.infer<
  typeof workflowAssistantResponseSchema
>
