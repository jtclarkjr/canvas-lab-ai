import {
  workflowDefinitionSchema,
  type WorkflowDefinition
} from '#lib/workflows/schema.js'
import {
  workflowDefinitionFromYaml,
  workflowDefinitionToYaml
} from '#lib/workflows/definition.js'
import type {
  DatabaseColumn,
  DatabaseFlowDefinition,
  DatabaseRelation,
  DatabaseTable
} from '#lib/workflows/database/schema.js'
import type {
  DatabaseFlowEdge,
  DatabaseFlowNode
} from '#lib/workflows/database/types.js'

const DEFAULT_DATABASE_TABLE_GAP = 300

export function defaultDatabaseDefinition(
  name = 'Database'
): DatabaseFlowDefinition {
  return normalizeDatabaseDefinition({
    version: 1,
    flowType: 'database',
    name,
    description: '',
    tables: [
      {
        id: 'profiles',
        name: 'profiles',
        schema: 'public',
        description: 'Application user profile data.',
        position: { x: 80, y: 80 },
        columns: [
          {
            id: 'id',
            name: 'id',
            dataType: 'uuid',
            nullable: false,
            primaryKey: true,
            unique: true,
            identity: false
          },
          {
            id: 'display_name',
            name: 'display_name',
            dataType: 'text',
            nullable: true
          },
          {
            id: 'avatar_url',
            name: 'avatar_url',
            dataType: 'text',
            nullable: true
          }
        ]
      },
      {
        id: 'projects',
        name: 'projects',
        schema: 'public',
        description: 'Projects owned by profiles.',
        position: { x: 420, y: 80 },
        columns: [
          {
            id: 'id',
            name: 'id',
            dataType: 'uuid',
            nullable: false,
            primaryKey: true,
            unique: true,
            identity: false,
            defaultValue: 'gen_random_uuid()'
          },
          {
            id: 'owner_id',
            name: 'owner_id',
            dataType: 'uuid',
            nullable: false
          },
          {
            id: 'name',
            name: 'name',
            dataType: 'text',
            nullable: false
          },
          {
            id: 'created_at',
            name: 'created_at',
            dataType: 'timestamptz',
            nullable: false,
            defaultValue: 'now()'
          }
        ]
      }
    ],
    relations: [
      {
        id: 'projects_owner_id_fkey',
        name: 'projects_owner_id_fkey',
        sourceTableId: 'projects',
        sourceColumnId: 'owner_id',
        targetTableId: 'profiles',
        targetColumnId: 'id',
        onDelete: 'cascade'
      }
    ]
  })
}

export function normalizeDatabaseDefinition(
  input: unknown
): DatabaseFlowDefinition {
  const normalized = workflowDefinitionSchema.parse(input)
  if (!isDatabaseFlowDefinition(normalized)) {
    throw new Error('Expected a database flow definition.')
  }
  return normalized
}

export function isDatabaseFlowDefinition(
  definition: WorkflowDefinition
): definition is DatabaseFlowDefinition {
  return definition.flowType === 'database'
}

export function databaseDefinitionToFlow(definition: WorkflowDefinition): {
  nodes: DatabaseFlowNode[]
  edges: DatabaseFlowEdge[]
} {
  const normalized = normalizeDatabaseDefinition(definition)
  const nodes = normalized.tables.map((table, index) => ({
    id: table.id,
    type: 'databaseTable' as const,
    position: table.position ?? {
      x: index * DEFAULT_DATABASE_TABLE_GAP,
      y: 80
    },
    data: { table }
  }))
  const edges = normalized.relations.map((relation) => ({
    id: relation.id,
    source: relation.sourceTableId,
    target: relation.targetTableId,
    sourceHandle: databaseColumnHandleId('source', relation.sourceColumnId),
    targetHandle: databaseColumnHandleId('target', relation.targetColumnId),
    type: 'smoothstep' as const,
    markerEnd: { type: 'arrowclosed' as const },
    data: {
      relationId: relation.id,
      sourceColumnId: relation.sourceColumnId,
      targetColumnId: relation.targetColumnId,
      name: relation.name,
      onDelete: relation.onDelete
    }
  }))

  return { nodes, edges }
}

export function databaseDefinitionFromFlow(
  nodes: DatabaseFlowNode[],
  edges: DatabaseFlowEdge[],
  previous: WorkflowDefinition
): DatabaseFlowDefinition {
  const normalized = normalizeDatabaseDefinition(previous)
  const previousTableById = new Map(
    normalized.tables.map((table) => [table.id, table])
  )
  const previousRelationById = new Map(
    normalized.relations.map((relation) => [relation.id, relation])
  )

  const tables = nodes.map((node, index) => {
    const table = node.data.table ?? previousTableById.get(node.id)
    return {
      ...(table ?? createFallbackDatabaseTable(node.id)),
      position: node.position ??
        table?.position ?? {
          x: index * DEFAULT_DATABASE_TABLE_GAP,
          y: 80
        }
    }
  })
  const tableIds = new Set(tables.map((table) => table.id))
  const columnsByTable = new Map(
    tables.map((table) => [
      table.id,
      new Set(table.columns.map((column) => column.id))
    ])
  )
  const usedRelationIds = new Set<string>()
  const relations: DatabaseRelation[] = []

  for (const edge of edges) {
    if (!edge.source || !edge.target) continue
    if (!tableIds.has(edge.source) || !tableIds.has(edge.target)) continue

    const sourceColumnId =
      edge.data?.sourceColumnId ??
      parseDatabaseColumnHandleId('source', edge.sourceHandle)
    const targetColumnId =
      edge.data?.targetColumnId ??
      parseDatabaseColumnHandleId('target', edge.targetHandle)

    if (!sourceColumnId || !targetColumnId) continue
    if (!columnsByTable.get(edge.source)?.has(sourceColumnId)) continue
    if (!columnsByTable.get(edge.target)?.has(targetColumnId)) continue

    const previousRelation = previousRelationById.get(
      edge.data?.relationId ?? edge.id
    )
    const id = makeUniqueId(
      edge.data?.relationId ||
        edge.id ||
        relationIdBase(edge.source, sourceColumnId),
      usedRelationIds
    )
    relations.push({
      id,
      name: previousRelation?.name ?? edge.data?.name ?? id,
      sourceTableId: edge.source,
      sourceColumnId,
      targetTableId: edge.target,
      targetColumnId,
      onDelete: previousRelation?.onDelete ?? edge.data?.onDelete
    })
  }

  return normalizeDatabaseDefinition({
    ...normalized,
    tables,
    relations
  })
}

export function createDatabaseTable(
  existing: WorkflowDefinition
): DatabaseTable {
  const normalized = normalizeDatabaseDefinition(existing)
  const usedIds = new Set(normalized.tables.map((table) => table.id))
  const id = makeUniqueId(`table_${normalized.tables.length + 1}`, usedIds)
  return {
    id,
    name: id,
    schema: 'public',
    description: '',
    position: {
      x: 80 + normalized.tables.length * DEFAULT_DATABASE_TABLE_GAP,
      y: 120
    },
    columns: [
      {
        id: 'id',
        name: 'id',
        dataType: 'uuid',
        nullable: false,
        primaryKey: true,
        unique: true,
        identity: false,
        defaultValue: 'gen_random_uuid()'
      }
    ]
  }
}

export function createDatabaseColumn(table: DatabaseTable): DatabaseColumn {
  const usedIds = new Set(table.columns.map((column) => column.id))
  const id = makeUniqueId(`column_${table.columns.length + 1}`, usedIds)
  return {
    id,
    name: id,
    dataType: 'text',
    nullable: true,
    primaryKey: false,
    unique: false,
    identity: false
  }
}

export function createDatabaseRelation(
  existing: WorkflowDefinition,
  sourceTableId: string,
  sourceColumnId: string,
  targetTableId: string,
  targetColumnId: string
): DatabaseRelation {
  const normalized = normalizeDatabaseDefinition(existing)
  const usedIds = new Set(normalized.relations.map((relation) => relation.id))
  const id = makeUniqueId(
    relationIdBase(sourceTableId, sourceColumnId),
    usedIds
  )
  return {
    id,
    name: id,
    sourceTableId,
    sourceColumnId,
    targetTableId,
    targetColumnId
  }
}

export function databaseColumnHandleId(
  kind: 'source' | 'target',
  columnId: string
) {
  return `${kind}:${columnId}`
}

export function parseDatabaseColumnHandleId(
  kind: 'source' | 'target',
  handleId: string | null | undefined
) {
  const prefix = `${kind}:`
  return handleId?.startsWith(prefix) ? handleId.slice(prefix.length) : null
}

function createFallbackDatabaseTable(id: string): DatabaseTable {
  return {
    id,
    name: id,
    schema: 'public',
    description: '',
    position: { x: 0, y: 0 },
    columns: []
  }
}

function relationIdBase(sourceTableId: string, sourceColumnId: string) {
  return `${sourceTableId}_${sourceColumnId}_fkey`
}

function makeUniqueId(baseId: string, usedIds: Set<string>) {
  let id = baseId
  let suffix = 2
  while (usedIds.has(id)) {
    id = `${baseId}_${suffix}`
    suffix += 1
  }
  usedIds.add(id)
  return id
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('database flow definitions', () => {
    it('round-trips database definitions through YAML', () => {
      const definition = defaultDatabaseDefinition('App database')
      const yaml = workflowDefinitionToYaml(definition)

      expect(workflowDefinitionFromYaml(yaml)).toEqual(definition)
    })

    it('converts database flow edges back to relations', () => {
      const definition = defaultDatabaseDefinition()
      const flow = databaseDefinitionToFlow(definition)
      const next = databaseDefinitionFromFlow(
        flow.nodes,
        [
          ...flow.edges,
          {
            id: 'profiles_id_self_fkey',
            source: 'profiles',
            target: 'profiles',
            sourceHandle: databaseColumnHandleId('source', 'id'),
            targetHandle: databaseColumnHandleId('target', 'id'),
            type: 'smoothstep',
            data: {
              relationId: 'profiles_id_self_fkey',
              sourceColumnId: 'id',
              targetColumnId: 'id'
            }
          }
        ],
        definition
      )

      expect(next.relations.map((relation) => relation.id)).toContain(
        'profiles_id_self_fkey'
      )
    })

    it('rejects database relations with missing endpoints', () => {
      expect(() =>
        normalizeDatabaseDefinition({
          version: 1,
          flowType: 'database',
          name: 'Broken database',
          description: '',
          tables: [
            {
              id: 'users',
              name: 'users',
              schema: 'public',
              columns: [{ id: 'id', name: 'id', dataType: 'uuid' }]
            }
          ],
          relations: [
            {
              id: 'missing_fkey',
              sourceTableId: 'users',
              sourceColumnId: 'missing',
              targetTableId: 'users',
              targetColumnId: 'id'
            }
          ]
        })
      ).toThrow()
    })
  })
}
