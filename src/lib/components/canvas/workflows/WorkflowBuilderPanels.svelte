<script lang="ts">
  import type { Scene } from '$lib/scenes/schema'
  import type { SceneDocumentsStore } from '$lib/stores/scenes/documents/types'
  import WorkflowAssistantPanel from '$lib/components/canvas/workflows/panels/WorkflowAssistantPanel.svelte'
  import WorkflowDetailsPanel from '$lib/components/canvas/workflows/panels/WorkflowDetailsPanel.svelte'
  import type {
    UpdateWorkflowInput,
    Workflow,
    WorkflowSettings
  } from '$lib/workflows/schema'

  let {
    canvasId,
    workflow,
    scenes,
    sceneDocumentsStore,
    canModify,
    fullscreen = false,
    onPatchWorkflow,
    onPatchYaml,
    onPatchNotes,
    onPatchSettings
  } = $props<{
    canvasId: string
    workflow: Workflow
    scenes: Scene[]
    sceneDocumentsStore: SceneDocumentsStore
    canModify: boolean
    fullscreen?: boolean
    onPatchWorkflow: (patch: UpdateWorkflowInput) => Promise<Workflow | null>
    onPatchYaml: (configYaml: string) => Promise<Workflow | null>
    onPatchNotes: (notes: string) => Promise<Workflow | null>
    onPatchSettings: (settings: WorkflowSettings) => Promise<Workflow | null>
  }>()
</script>

<WorkflowAssistantPanel
  {canvasId}
  {workflow}
  {scenes}
  {sceneDocumentsStore}
  {canModify}
  {fullscreen}
  {onPatchWorkflow}
  {onPatchSettings}
/>

<WorkflowDetailsPanel
  {canvasId}
  {workflow}
  {canModify}
  {fullscreen}
  {onPatchWorkflow}
  {onPatchYaml}
  {onPatchNotes}
/>
