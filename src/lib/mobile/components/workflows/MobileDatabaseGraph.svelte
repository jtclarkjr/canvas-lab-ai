<script lang="ts">
  import {
    Background,
    BackgroundVariant,
    Controls,
    SvelteFlow,
    type Connection,
    type EdgeTypes,
    type NodeTypes
  } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import { Database, Plus } from 'lucide-svelte'
  import DeletableSmoothStepEdge from '#lib/components/canvas/workflows/DeletableSmoothStepEdge.svelte'
  import GraphInteractivityStatus from '#lib/components/canvas/workflows/GraphInteractivityStatus.svelte'
  import MobileDatabaseTableNode from '#lib/mobile/components/workflows/MobileDatabaseTableNode.svelte'
  import { theme } from '#lib/stores/shared/theme.svelte.js'
  import {
    createDatabaseRelation,
    createDatabaseTable,
    databaseColumnHandleId,
    databaseDefinitionFromFlow,
    databaseDefinitionToFlow,
    isDatabaseFlowDefinition,
    parseDatabaseColumnHandleId
  } from '#lib/workflows/database/definition.js'
  import type {
    DatabaseFlowEdge,
    DatabaseFlowNode
  } from '#lib/workflows/database/types.js'
  import type { Workflow, WorkflowDefinition } from '#lib/workflows/schema.js'

  let { workflow, canEdit, lockedLabel, onDefinitionChange } = $props<{
    workflow: Workflow
    canEdit: boolean
    lockedLabel?: string
    onDefinitionChange: (definition: WorkflowDefinition) => void | Promise<void>
  }>()

  let nodes = $state<DatabaseFlowNode[]>([])
  let edges = $state<DatabaseFlowEdge[]>([])
  let syncedKey = $state('')
  let isConnecting = $state(false)

  const nodeTypes: NodeTypes = {
    databaseTable: MobileDatabaseTableNode
  }

  const edgeTypes: EdgeTypes = {
    smoothstep: DeletableSmoothStepEdge
  }

  $effect(() => {
    if (!isDatabaseFlowDefinition(workflow.definition)) {
      nodes = []
      edges = []
      return
    }

    const nextKey = `${workflow.id}:${workflow.updatedAt}:${canEdit}:${JSON.stringify(
      workflow.definition
    )}`
    if (nextKey === syncedKey) {
      return
    }

    const flow = databaseDefinitionToFlow(workflow.definition)
    nodes = flow.nodes.map((node) => ({ ...node, deletable: canEdit }))
    edges = flow.edges.map((edge) => ({ ...edge, deletable: canEdit }))
    syncedKey = nextKey
  })

  function emitDefinition(next: WorkflowDefinition) {
    void onDefinitionChange(next)
  }

  function commitFlow() {
    if (!canEdit || !isDatabaseFlowDefinition(workflow.definition)) return
    emitDefinition(
      databaseDefinitionFromFlow(nodes, edges, workflow.definition)
    )
  }

  function isEditableTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false
    return (
      target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    )
  }

  function deleteSelectedElements() {
    const selectedNodeIds = new Set(
      nodes.filter((node) => node.selected).map((node) => node.id)
    )
    const selectedEdgeIds = new Set(
      edges.filter((edge) => edge.selected).map((edge) => edge.id)
    )

    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) {
      return false
    }

    nodes = nodes.filter((node) => !selectedNodeIds.has(node.id))
    edges = edges.filter(
      (edge) =>
        !selectedEdgeIds.has(edge.id) &&
        !selectedNodeIds.has(edge.source) &&
        !selectedNodeIds.has(edge.target)
    )
    commitFlow()
    return true
  }

  function handleGraphKeydown(event: KeyboardEvent) {
    const isDeleteKey = event.key === 'Backspace' || event.key === 'Delete'
    const hasModifier =
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey

    if (
      canEdit &&
      isDeleteKey &&
      !hasModifier &&
      !isEditableTarget(event.target) &&
      deleteSelectedElements()
    ) {
      event.preventDefault()
    }

    event.stopPropagation()
  }

  function handleConnect(connection: Connection) {
    if (
      !canEdit ||
      !isDatabaseFlowDefinition(workflow.definition) ||
      !connection.source ||
      !connection.target
    ) {
      return
    }

    const sourceColumnId = parseDatabaseColumnHandleId(
      'source',
      connection.sourceHandle
    )
    const targetColumnId = parseDatabaseColumnHandleId(
      'target',
      connection.targetHandle
    )
    if (!sourceColumnId || !targetColumnId) return

    const duplicate = edges.some(
      (edge) =>
        edge.source === connection.source &&
        edge.target === connection.target &&
        edge.data?.sourceColumnId === sourceColumnId &&
        edge.data?.targetColumnId === targetColumnId
    )
    if (duplicate) return

    const relation = createDatabaseRelation(
      workflow.definition,
      connection.source,
      sourceColumnId,
      connection.target,
      targetColumnId
    )
    edges = [
      ...edges,
      {
        id: relation.id,
        source: relation.sourceTableId,
        target: relation.targetTableId,
        sourceHandle: databaseColumnHandleId('source', relation.sourceColumnId),
        targetHandle: databaseColumnHandleId('target', relation.targetColumnId),
        type: 'smoothstep',
        markerEnd: { type: 'arrowclosed' },
        data: {
          relationId: relation.id,
          sourceColumnId: relation.sourceColumnId,
          targetColumnId: relation.targetColumnId,
          name: relation.name,
          onDelete: relation.onDelete
        }
      }
    ]
    commitFlow()
  }

  function handleConnectStart() {
    isConnecting = true
  }

  function handleConnectEnd() {
    isConnecting = false
  }

  function addTable() {
    if (!canEdit || !isDatabaseFlowDefinition(workflow.definition)) return
    emitDefinition({
      ...workflow.definition,
      tables: [
        ...workflow.definition.tables,
        createDatabaseTable(workflow.definition)
      ]
    })
  }

  function stopSheetGesture(event: Event) {
    event.stopPropagation()
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class={`mobile-database-graph relative h-full min-h-[320px] overflow-hidden bg-background/80 ${
    isConnecting ? 'is-connecting' : ''
  }`}
  role="application"
  aria-label="Database flow editor"
  tabindex="-1"
  onpointerdown={stopSheetGesture}
  onpointermove={stopSheetGesture}
  onpointerup={stopSheetGesture}
  onkeydown={handleGraphKeydown}
>
  {#if canEdit}
    <div
      class="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full border border-border/80 bg-background/90 p-1 shadow-sm backdrop-blur"
    >
      <button
        type="button"
        class="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-foreground transition hover:bg-muted"
        onclick={addTable}
      >
        <Plus class="size-3.5" aria-hidden="true" />
        Table
      </button>
    </div>
  {/if}

  <SvelteFlow
    bind:nodes
    bind:edges
    fitView
    {nodeTypes}
    {edgeTypes}
    colorMode={theme.current}
    nodesDraggable={canEdit}
    nodesConnectable={canEdit}
    elementsSelectable={canEdit}
    deleteKey={canEdit ? ['Backspace', 'Delete'] : null}
    minZoom={0.2}
    maxZoom={1.8}
    defaultEdgeOptions={{
      type: 'smoothstep',
      markerEnd: { type: 'arrowclosed' as const }
    }}
    onconnect={handleConnect}
    onconnectstart={handleConnectStart}
    onconnectend={handleConnectEnd}
    onnodedragstop={commitFlow}
    ondelete={commitFlow}
    proOptions={{ hideAttribution: true }}
  >
    <Controls showLock={false} />
    <GraphInteractivityStatus {canEdit} {lockedLabel} />
    <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
  </SvelteFlow>

  {#if nodes.length === 0}
    <div
      class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
    >
      <div class="flex items-center gap-2">
        <Database class="size-4" aria-hidden="true" />
        Empty database
      </div>
    </div>
  {/if}
</div>
