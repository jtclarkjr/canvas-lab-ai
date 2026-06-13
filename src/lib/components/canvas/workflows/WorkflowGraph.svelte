<script lang="ts">
  import {
    Background,
    BackgroundVariant,
    Controls,
    SvelteFlow,
    type Connection,
    type NodeTypes
  } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import { GitBranch, ListPlus, Plus, Split } from 'lucide-svelte'
  import WorkflowNode from '$lib/components/canvas/workflows/WorkflowNode.svelte'
  import {
    createWorkflowStep,
    workflowDefinitionFromFlow,
    workflowDefinitionToFlow,
    type WorkflowFlowEdge,
    type WorkflowFlowNode
  } from '$lib/workflows/definition'
  import type {
    Workflow,
    WorkflowDefinition,
    WorkflowStepType
  } from '$lib/workflows/schema'

  let { workflow, canEdit, onDefinitionChange } = $props<{
    workflow: Workflow
    canEdit: boolean
    onDefinitionChange: (definition: WorkflowDefinition) => void | Promise<void>
  }>()

  let nodes = $state<WorkflowFlowNode[]>([])
  let edges = $state<WorkflowFlowEdge[]>([])
  let syncedKey = $state('')

  const nodeTypes: NodeTypes = {
    workflow: WorkflowNode
  }

  $effect(() => {
    const nextKey = `${workflow.id}:${workflow.updatedAt}:${JSON.stringify(
      workflow.definition
    )}`
    if (nextKey === syncedKey) {
      return
    }

    const flow = workflowDefinitionToFlow(workflow.definition)
    nodes = flow.nodes
    edges = flow.edges
    syncedKey = nextKey
  })

  function emitDefinition(next: WorkflowDefinition) {
    void onDefinitionChange(next)
  }

  function commitFlow() {
    if (!canEdit) return
    emitDefinition(
      workflowDefinitionFromFlow(nodes, edges, workflow.definition)
    )
  }

  function handleConnect(connection: Connection) {
    if (!canEdit || !connection.source || !connection.target) return
    const id = `${connection.source}->${connection.target}`
    if (edges.some((edge) => edge.id === id)) return
    edges = [
      ...edges,
      {
        id,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'smoothstep',
        markerEnd: { type: 'arrowclosed' },
        data: {}
      }
    ]
    commitFlow()
  }

  function addStep(type: WorkflowStepType) {
    if (!canEdit) return
    emitDefinition({
      ...workflow.definition,
      steps: [
        ...workflow.definition.steps,
        createWorkflowStep(workflow.definition, type)
      ]
    })
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="workflow-graph relative h-full min-h-[260px] overflow-hidden bg-background/80"
  role="application"
  aria-label="Workflow graph editor"
  tabindex="-1"
  onpointerdown={(event) => event.stopPropagation()}
  onpointermove={(event) => event.stopPropagation()}
  onpointerup={(event) => event.stopPropagation()}
  onkeydown={(event) => event.stopPropagation()}
>
  {#if canEdit}
    <div
      class="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-md border border-border/80 bg-background/90 p-1 shadow-sm backdrop-blur"
    >
      <button
        type="button"
        class="flex h-8 items-center gap-1.5 rounded px-2 text-xs font-medium text-foreground transition hover:bg-muted"
        onclick={() => addStep('task')}
      >
        <Plus class="size-3.5" />
        Step
      </button>
      <button
        type="button"
        class="flex h-8 items-center gap-1.5 rounded px-2 text-xs font-medium text-foreground transition hover:bg-muted"
        onclick={() => addStep('decision')}
      >
        <Split class="size-3.5" />
        Decision
      </button>
      <button
        type="button"
        class="flex h-8 items-center gap-1.5 rounded px-2 text-xs font-medium text-foreground transition hover:bg-muted"
        onclick={() => addStep('output')}
      >
        <ListPlus class="size-3.5" />
        Output
      </button>
    </div>
  {/if}

  <SvelteFlow
    bind:nodes
    bind:edges
    fitView
    {nodeTypes}
    nodesDraggable={canEdit}
    nodesConnectable={canEdit}
    elementsSelectable={canEdit}
    deleteKey={canEdit ? ['Backspace', 'Delete'] : null}
    minZoom={0.25}
    maxZoom={1.5}
    defaultEdgeOptions={{
      type: 'smoothstep',
      markerEnd: { type: 'arrowclosed' as const }
    }}
    onconnect={handleConnect}
    onnodedragstop={commitFlow}
    ondelete={commitFlow}
  >
    <Controls />
    <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
  </SvelteFlow>

  {#if nodes.length === 0}
    <div
      class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
    >
      <div class="flex items-center gap-2">
        <GitBranch class="size-4" />
        Empty workflow
      </div>
    </div>
  {/if}
</div>
