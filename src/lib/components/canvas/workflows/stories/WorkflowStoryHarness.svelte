<script lang="ts">
  import WorkflowBuilderPanels from '../WorkflowBuilderPanels.svelte'
  import WorkflowFrame from '../WorkflowFrame.svelte'
  import WorkflowFullscreenView from '../WorkflowFullscreenView.svelte'
  import WorkflowGraph from '../WorkflowGraph.svelte'
  import WorkflowLayer from '../WorkflowLayer.svelte'
  import WorkflowResizeHandle from '../WorkflowResizeHandle.svelte'
  import WorkflowTitleEditor from '../WorkflowTitleEditor.svelte'
  import DatabaseGraph from '../database/DatabaseGraph.svelte'
  import DatabaseSchemaPanel from '../database/DatabaseSchemaPanel.svelte'
  import WorkflowAssistantPanel from '../panels/WorkflowAssistantPanel.svelte'
  import WorkflowContextPicker from '../panels/WorkflowContextPicker.svelte'
  import WorkflowDetailsPanel from '../panels/WorkflowDetailsPanel.svelte'
  import WorkflowDraggablePanel from '../panels/WorkflowDraggablePanel.svelte'
  import MobileDatabaseGraph from '$lib/mobile/components/workflows/MobileDatabaseGraph.svelte'
  import MobileWorkflowCard from '$lib/mobile/components/workflows/MobileWorkflowCard.svelte'
  import MobileWorkflowFullscreen from '$lib/mobile/components/workflows/MobileWorkflowFullscreen.svelte'
  import MobileWorkflowGraph from '$lib/mobile/components/workflows/MobileWorkflowGraph.svelte'
  import MobileWorkflowLayer from '$lib/mobile/components/workflows/MobileWorkflowLayer.svelte'
  import MobileWorkflowSheet from '$lib/mobile/components/workflows/MobileWorkflowSheet.svelte'
  import MobileWorkflowSummary from '$lib/mobile/components/workflows/MobileWorkflowSummary.svelte'
  import { provideSceneDocumentsStore } from '$lib/stores/scenes/documents.svelte'
  import type { Workflow, WorkflowDefinition } from '$lib/workflows/schema'
  import type { DatabaseFlowDefinition } from '$lib/workflows/database/schema'
  import { sceneFixture } from '../../scenes/stories/fixtures'
  import { documentItems } from '../../scenes/document/stories/fixtures'
  import { databaseWorkflowFixture, workflowFixture } from './fixtures'

  type Target =
    | 'assistant-panel'
    | 'builder-panels'
    | 'context-picker'
    | 'database-graph'
    | 'database-schema-panel'
    | 'database-table-node'
    | 'details-panel'
    | 'draggable-panel'
    | 'edge'
    | 'frame'
    | 'fullscreen'
    | 'graph'
    | 'interactivity'
    | 'layer'
    | 'node'
    | 'resize-handle'
    | 'title-editor'
    | 'mobile-database-graph'
    | 'mobile-database-table-node'
    | 'mobile-card'
    | 'mobile-fullscreen'
    | 'mobile-graph'
    | 'mobile-layer'
    | 'mobile-node'
    | 'mobile-sheet'
    | 'mobile-summary'

  let { target } = $props<{ target: Target }>()

  let workflow = $state<Workflow>({ ...workflowFixture })
  let databaseWorkflow = $state<Workflow>({ ...databaseWorkflowFixture })
  let result = $state('')
  let selectedSceneIds = $state<string[]>([])
  let selectedDocumentIds = $state<string[]>([])

  const documentsStore = provideSceneDocumentsStore({
    canvasId: workflowFixture.canvasId,
    initialItemsBySceneId: { [sceneFixture.id]: documentItems }
  })

  const handlers = {
    pointerDown: () => (result = 'pointer-down'),
    pointerMove: () => undefined,
    pointerUp: () => undefined,
    pointerCancel: () => undefined,
    resizePointerDown: (_event: PointerEvent, id: string) =>
      (result = `resize:${id}`),
    resizePointerMove: () => undefined,
    resizePointerUp: () => undefined,
    resizePointerCancel: () => undefined
  }

  function updateWorkflowDefinition(definition: WorkflowDefinition) {
    workflow = { ...workflow, definition }
    result = 'definition'
  }

  async function patchWorkflow() {
    result = 'patch'
    return workflow
  }
</script>

<div
  class="relative min-h-[42rem] overflow-hidden bg-background p-6 text-foreground"
>
  {#if target === 'graph' || target === 'node' || target === 'edge' || target === 'interactivity'}
    <div
      class="h-[38rem] overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      <WorkflowGraph
        {workflow}
        canEdit
        onDefinitionChange={updateWorkflowDefinition}
      />
    </div>
  {:else if target === 'database-graph' || target === 'database-table-node'}
    <div
      class="h-[38rem] overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      <DatabaseGraph
        workflow={databaseWorkflow}
        canEdit
        onDefinitionChange={(definition) => {
          databaseWorkflow = { ...databaseWorkflow, definition }
          result = 'database-definition'
        }}
      />
    </div>
  {:else if target === 'database-schema-panel'}
    <div
      class="h-[38rem] overflow-auto rounded-2xl border border-border/60 bg-card p-4"
    >
      <DatabaseSchemaPanel
        definition={databaseWorkflow.definition as DatabaseFlowDefinition}
        canModify
        onDefinitionChange={(definition) => {
          databaseWorkflow = { ...databaseWorkflow, definition }
          result = 'database-definition'
        }}
      />
    </div>
  {:else if target === 'resize-handle'}
    <div class="relative h-56 w-80 rounded-2xl border border-border bg-card">
      <WorkflowResizeHandle workflowId={workflow.id} {handlers} />
    </div>
  {:else if target === 'title-editor'}
    <div
      class="group flex max-w-md items-center rounded-xl border border-border/60 bg-card p-4"
    >
      <WorkflowTitleEditor
        title={workflow.title}
        canModify
        onSave={(title) => {
          workflow = { ...workflow, title }
          result = title
        }}
      />
    </div>
  {:else if target === 'frame'}
    <WorkflowFrame
      {workflow}
      camera={{ x: 0, y: 0, scale: 0.8 }}
      focused
      canModify
      canDrag
      canActivate
      interactive
      {handlers}
      onFocus={(id) => (result = `focus:${id}`)}
      onMaximize={(id) => (result = `maximize:${id}`)}
      onDelete={(id) => (result = `delete:${id}`)}
      onRename={async (_id, title) => {
        result = title
      }}
      onDefinitionChange={updateWorkflowDefinition}
    />
  {:else if target === 'fullscreen'}
    <WorkflowFullscreenView
      {workflow}
      canEdit
      canModify
      onMinimize={() => (result = 'minimize')}
      onDelete={(id) => (result = `delete:${id}`)}
      onRename={async (_id, title) => {
        result = title
      }}
      onDefinitionChange={updateWorkflowDefinition}
    />
  {:else if target === 'layer'}
    <WorkflowLayer
      canvasId={workflow.canvasId}
      workflows={[workflow]}
      focusedWorkflow={null}
      scenes={[sceneFixture]}
      sceneDocumentsStore={documentsStore}
      camera={{ x: 0, y: 0, scale: 0.8 }}
      mode="workflows"
      selectedTool="select"
      canEdit
      canModifyWorkflow={() => true}
      {handlers}
      onCreateWorkflow={() => (result = 'create')}
      onFocusWorkflow={(id) => (result = `focus:${id}`)}
      onClearFocusedWorkflow={() => (result = 'clear')}
      onDeleteWorkflow={(id) => (result = `delete:${id}`)}
      onPatchWorkflow={async () => workflow}
      onPatchWorkflowDefinition={async () => workflow}
      onPatchWorkflowYaml={async () => workflow}
      onPatchWorkflowNotes={async () => workflow}
      onPatchWorkflowSettings={async () => workflow}
    />
  {:else if target === 'builder-panels'}
    <WorkflowBuilderPanels
      canvasId={workflow.canvasId}
      {workflow}
      scenes={[sceneFixture]}
      sceneDocumentsStore={documentsStore}
      canModify
      onPatchWorkflow={patchWorkflow}
      onPatchYaml={patchWorkflow}
      onPatchNotes={patchWorkflow}
      onPatchSettings={patchWorkflow}
    />
  {:else if target === 'assistant-panel'}
    <WorkflowAssistantPanel
      canvasId={workflow.canvasId}
      {workflow}
      scenes={[sceneFixture]}
      sceneDocumentsStore={documentsStore}
      canModify
      onPatchWorkflow={patchWorkflow}
      onPatchSettings={patchWorkflow}
    />
  {:else if target === 'details-panel'}
    <WorkflowDetailsPanel
      canvasId={workflow.canvasId}
      {workflow}
      canModify
      onPatchWorkflow={patchWorkflow}
      onPatchYaml={patchWorkflow}
      onPatchNotes={patchWorkflow}
    />
  {:else if target === 'context-picker'}
    <WorkflowContextPicker
      scenes={[sceneFixture]}
      savedDocuments={documentItems.filter((item) => item.status === 'saved')}
      includeLinkedScenes
      {selectedSceneIds}
      {selectedDocumentIds}
      onIncludeLinkedScenesChange={() => undefined}
      onToggleScene={(id) => {
        selectedSceneIds = [id]
        result = id
      }}
      onToggleDocument={(id) => {
        selectedDocumentIds = [id]
        result = id
      }}
    />
  {:else if target === 'draggable-panel'}
    <WorkflowDraggablePanel
      side="right"
      panelWidth={360}
      ariaLabel="Story workflow panel"
      openLabel="story panel"
    >
      {#snippet launcher()}<span>W</span>{/snippet}
      {#snippet header({ minimize })}
        <div class="flex w-full items-center justify-between p-3">
          <strong>Workflow panel</strong>
          <button type="button" onclick={minimize}>Minimize panel</button>
        </div>
      {/snippet}
      <div class="p-4">Reusable draggable panel content.</div>
    </WorkflowDraggablePanel>
  {:else if target === 'mobile-database-graph' || target === 'mobile-database-table-node'}
    <div
      class="h-[40rem] overflow-hidden rounded-2xl border border-border bg-card"
    >
      <MobileDatabaseGraph
        workflow={databaseWorkflow}
        canEdit
        onDefinitionChange={(definition) => {
          databaseWorkflow = { ...databaseWorkflow, definition }
          result = 'database-definition'
        }}
      />
    </div>
  {:else if target === 'mobile-graph' || target === 'mobile-node'}
    <div
      class="h-[40rem] overflow-hidden rounded-2xl border border-border bg-card"
    >
      <MobileWorkflowGraph
        {workflow}
        canEdit
        onDefinitionChange={updateWorkflowDefinition}
      />
    </div>
  {:else if target === 'mobile-card'}
    <MobileWorkflowCard
      {workflow}
      camera={{ x: 0, y: 0, scale: 0.55 }}
      interactive
      canModify
      canActivate
      {handlers}
      onActivate={(id) => (result = `activate:${id}`)}
      onOpen={(id) => (result = `open:${id}`)}
      onDelete={(id) => (result = `delete:${id}`)}
    />
  {:else if target === 'mobile-fullscreen'}
    <MobileWorkflowFullscreen
      canvasId={workflow.canvasId}
      {workflow}
      scenes={[sceneFixture]}
      sceneDocumentsStore={documentsStore}
      canEdit
      canModify
      onMinimize={() => (result = 'minimize')}
      onDelete={(id) => (result = `delete:${id}`)}
      onPatchWorkflow={patchWorkflow}
      onPatchYaml={patchWorkflow}
      onPatchNotes={patchWorkflow}
      onPatchSettings={patchWorkflow}
    />
  {:else if target === 'mobile-layer'}
    <MobileWorkflowLayer
      canvasId={workflow.canvasId}
      workflows={[workflow]}
      focusedWorkflow={null}
      scenes={[sceneFixture]}
      sceneDocumentsStore={documentsStore}
      camera={{ x: 0, y: 0, scale: 0.55 }}
      mode="workflows"
      canEdit
      canModifyWorkflow={() => true}
      {handlers}
      onFocusWorkflow={(id) => (result = `focus:${id}`)}
      onClearFocusedWorkflow={() => (result = 'clear')}
      onDeleteWorkflow={(id) => (result = `delete:${id}`)}
      onPatchWorkflow={async () => workflow}
      onPatchWorkflowDefinition={async () => workflow}
      onPatchWorkflowYaml={async () => workflow}
      onPatchWorkflowNotes={async () => workflow}
      onPatchWorkflowSettings={async () => workflow}
    />
  {:else if target === 'mobile-sheet'}
    <div class="relative h-[42rem] overflow-hidden rounded-2xl bg-card">
      <MobileWorkflowSheet
        canvasId={workflow.canvasId}
        {workflow}
        scenes={[sceneFixture]}
        sceneDocumentsStore={documentsStore}
        canModify
        onClose={() => (result = 'close')}
        onPatchWorkflow={patchWorkflow}
        onPatchYaml={patchWorkflow}
        onPatchNotes={patchWorkflow}
        onPatchSettings={patchWorkflow}
      />
    </div>
  {:else if target === 'mobile-summary'}
    <div
      class="h-[40rem] overflow-hidden rounded-2xl border border-border bg-card"
    >
      <MobileWorkflowSummary {workflow} />
    </div>
  {/if}

  <output class="sr-only" data-testid="workflow-result">{result}</output>
</div>
